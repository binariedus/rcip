import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values: options } = parseArgs({ options: {
  'registry-version': { type: 'string' },
  browser: { type: 'boolean', default: false },
} })
const registryVersion = options['registry-version']
if (registryVersion && !/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?$/.test(registryVersion)) {
  throw new Error('--registry-version must be an exact version.')
}

const workspaceRoot = process.cwd()
const temporaryRoot = mkdtempSync(join(tmpdir(), 'rcip-consumers-'))
// One isolated npm cache per registry run, reused across the React consumers.
const consumerEnv = registryVersion
  ? { ...process.env, npm_config_cache: join(temporaryRoot, 'npm-cache'), npm_config_registry: 'https://registry.npmjs.org/' }
  : process.env

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    env: consumerEnv,
    timeout: 5 * 60_000,
  })
  if (result.status !== 0) {
    if (capture) {
      process.stderr.write(result.stdout)
      process.stderr.write(result.stderr)
    }
    throw new Error(`${command} ${args.join(' ')} failed.`)
  }
  return result.stdout
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

async function createConsumer(versionName, reactVersion, reactTypesVersion, packageSpec, browser) {
  const fixtureRoot = join(temporaryRoot, versionName)
  const sourceRoot = join(fixtureRoot, 'src')
  mkdirSync(sourceRoot, { recursive: true })

  writeJson(join(fixtureRoot, 'package.json'), {
    name: `rcip-consumer-${versionName}`,
    private: true,
    type: 'module',
    scripts: {
      build: 'tsc --noEmit && vite build',
    },
    dependencies: {
      '@binaried/rcip': packageSpec,
      react: reactVersion,
      'react-dom': reactVersion,
    },
    devDependencies: {
      '@types/react': reactTypesVersion,
      '@types/react-dom': reactTypesVersion,
      typescript: '~5.8.3',
      vite: '^6.4.3',
    },
  })
  writeJson(join(fixtureRoot, 'tsconfig.json'), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: 'react-jsx',
      lib: ['ES2022', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: 'ES2022',
    },
    include: ['src'],
  })
  writeFileSync(
    join(fixtureRoot, 'index.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  )
  writeFileSync(
    join(sourceRoot, 'main.tsx'),
    readFileSync(new URL('./fixtures/consumer.tsx', import.meta.url), 'utf8'),
  )

  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    fixtureRoot,
  )
  if (registryVersion) {
    const installed = JSON.parse(readFileSync(join(fixtureRoot, 'node_modules/@binaried/rcip/package.json'), 'utf8'))
    if (installed.version !== registryVersion) throw new Error('Installed registry version does not match requested version.')
  }
  run(
    'node',
    [
      '--input-type=module',
      '--eval',
      "import('@binaried/rcip/core').then((core) => { if (core.RCIP_PROTOCOL_VERSION !== '1.0') process.exit(1) })",
    ],
    fixtureRoot,
  )
  run(
    'node',
    [
      '--eval',
      "const core = require('@binaried/rcip/core'); if (core.RCIP_PROTOCOL_VERSION !== '1.0') process.exit(1)",
    ],
    fixtureRoot,
  )
  run('npm', ['run', 'build'], fixtureRoot)
  if (browser) {
    const { checkConsumerBrowser } = await import('./check-consumer-browser.mjs')
    await checkConsumerBrowser(browser, fixtureRoot)
    console.log(`PASS ${versionName}: composed browser checks`)
  }
}

let browser
try {
  if (options.browser) {
    const { chromium } = await import('@playwright/test')
    browser = await chromium.launch({ headless: true })
  }
  let packageSpec = registryVersion
  if (!packageSpec) {
    const packOutput = run('npm', [
      'pack', '--workspace', '@binaried/rcip', '--pack-destination', temporaryRoot, '--json',
    ], workspaceRoot, true)
    const report = JSON.parse(packOutput)[0]
    const tarball = join(temporaryRoot, report.filename)
    if (readFileSync(tarball).byteLength === 0) throw new Error('Packed RCIP tarball is empty.')
    packageSpec = `file:${tarball}`
  }
  await createConsumer('react-18-minimum', '18.2.0', '^18.3.0', packageSpec, browser)
  await createConsumer('react-18', '18.3.1', '^18.3.0', packageSpec, browser)
  await createConsumer('react-19', '19.1.1', '^19.1.0', packageSpec, browser)
  console.log(`${registryVersion ? 'Registry' : 'Packed'} RCIP consumers passed for React 18 and 19.`)
} finally {
  await browser?.close()
  rmSync(temporaryRoot, { recursive: true, force: true })
}
