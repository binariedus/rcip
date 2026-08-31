import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const result = spawnSync(
  'npm',
  ['pack', '--workspace', '@binaried/rcip', '--dry-run', '--json'],
  { cwd: process.cwd(), encoding: 'utf8' },
)

if (result.status !== 0) {
  process.stderr.write(result.stderr)
  process.exit(result.status ?? 1)
}

const reports = JSON.parse(result.stdout)
const report = reports[0]
const files = new Set(report.files.map((file) => file.path))
const requiredFiles = [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
  'dist/core/index.js',
  'dist/core/index.cjs',
  'dist/core/index.d.ts',
  'dist/core/index.d.cts',
  'dist/assist/index.js',
  'dist/assist/index.cjs',
  'dist/assist/index.d.ts',
  'dist/assist/index.d.cts',
  'dist/explorer/index.js',
  'dist/explorer/index.cjs',
  'dist/explorer/index.d.ts',
  'dist/explorer/index.d.cts',
  'dist/react/index.js',
  'dist/react/index.cjs',
  'dist/react/index.d.ts',
  'dist/react/index.d.cts',
  'styles/explorer.css',
  'styles/assist.css',
  'LICENSE',
  'README.md',
  'package.json',
]

for (const file of requiredFiles) {
  if (!files.has(file)) {
    throw new Error(`Packed RCIP SDK is missing ${file}.`)
  }
}

for (const file of files) {
  if (
    file.startsWith('src/') ||
    file.startsWith('examples/') ||
    file.endsWith('.env') ||
    file.endsWith('.tgz')
  ) {
    throw new Error(`Packed RCIP SDK contains forbidden file ${file}.`)
  }
}

const reactEntry = readFileSync('packages/rcip/dist/react/index.js', 'utf8')
if (!/from ['"]react['"]/.test(reactEntry)) {
  throw new Error('React must remain external in the RCIP package output.')
}

const explorerEntry = readFileSync(
  'packages/rcip/dist/explorer/index.js',
  'utf8',
)
if (!/from ['"]react['"]/.test(explorerEntry)) {
  throw new Error('React must remain external in the explorer package output.')
}

const assistEntry = readFileSync('packages/rcip/dist/assist/index.js', 'utf8')
if (!/from ['"]react['"]/.test(assistEntry)) {
  throw new Error('React must remain external in the assist package output.')
}

process.stdout.write(
  `RCIP package dry-run passed with ${String(files.size)} files.\n`,
)
