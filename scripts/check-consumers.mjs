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

const workspaceRoot = process.cwd()
const temporaryRoot = mkdtempSync(join(tmpdir(), 'rcip-consumers-'))

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
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

function createConsumer(versionName, reactVersion, reactTypesVersion, tarball) {
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
      '@binaried/rcip': `file:${tarball}`,
      react: reactVersion,
      'react-dom': reactVersion,
    },
    devDependencies: {
      '@types/react': reactTypesVersion,
      '@types/react-dom': reactTypesVersion,
      typescript: '~5.8.3',
      vite: '^6.3.5',
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
    `import { createRoot } from 'react-dom/client'
import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipApplication,
} from '@binaried/rcip/core'
import { RcipCapabilityExplorer } from '@binaried/rcip/explorer'
import {
  RcipAssist,
  type RcipAssistDecide,
} from '@binaried/rcip/assist'
import '@binaried/rcip/explorer/styles.css'
import '@binaried/rcip/assist/styles.css'

if (RCIP_PROTOCOL_VERSION !== '1.0') throw new Error('Unexpected protocol.')

const runtime = createRcipRuntime(
  defineRcipApplication({
    protocolVersion: RCIP_PROTOCOL_VERSION,
    application: {
      id: 'consumer.fixture',
      name: 'Consumer fixture',
      description: 'Packed package verification.',
    },
    scopes: [],
    capabilities: [],
  }),
)
const root = document.getElementById('root')
if (!root) throw new Error('Missing root.')
const decide: RcipAssistDecide = async (request) => ({
  type: 'message',
  message:
    request.phase === 'summarize'
      ? 'The action completed.'
      : 'No actions are registered.',
})
createRoot(root).render(
  <>
    <RcipCapabilityExplorer client={runtime.client} />
    <RcipAssist runtime={runtime} decide={decide} />
  </>,
)
`,
  )

  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    fixtureRoot,
  )
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
}

try {
  const packOutput = run(
    'npm',
    [
      'pack',
      '--workspace',
      '@binaried/rcip',
      '--pack-destination',
      temporaryRoot,
      '--json',
    ],
    workspaceRoot,
    true,
  )
  const report = JSON.parse(packOutput)[0]
  const tarball = join(temporaryRoot, report.filename)
  if (readFileSync(tarball).byteLength === 0) {
    throw new Error('Packed RCIP tarball is empty.')
  }

  createConsumer('react-18', '18.3.1', '^18.3.0', tarball)
  createConsumer('react-19', '19.1.1', '^19.1.0', tarball)
  process.stdout.write('Packed RCIP consumers passed for React 18 and 19.\n')
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
