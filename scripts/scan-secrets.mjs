import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const version = '8.30.1'
const expected =
  '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'
if (process.platform !== 'linux' || process.arch !== 'x64')
  throw new Error(
    'Use the Linux x64 release-validation runner for secret scanning.',
  )
const directory = mkdtempSync(join(tmpdir(), 'rcip-secret-scan-'))
try {
  const response = await fetch(
    `https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_linux_x64.tar.gz`,
  )
  if (!response.ok)
    throw new Error(`Scanner download failed: ${response.status}`)
  const archive = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(archive).digest('hex') !== expected)
    throw new Error('Scanner checksum mismatch.')
  const archivePath = join(directory, 'gitleaks.tar.gz')
  writeFileSync(archivePath, archive)
  execFileSync('tar', ['-xzf', archivePath, '-C', directory, 'gitleaks'])
  execFileSync(
    join(directory, 'gitleaks'),
    ['git', '--redact', '--no-banner', '--log-opts=--all', '.'],
    { stdio: 'inherit' },
  )
} finally {
  rmSync(directory, { recursive: true, force: true })
}
