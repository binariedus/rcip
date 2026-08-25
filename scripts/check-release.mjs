import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'))
const publicPackage = JSON.parse(
  readFileSync('packages/rcip/package.json', 'utf8'),
)
const tag = execFileSync('git', ['describe', '--tags', '--exact-match'], {
  encoding: 'utf8',
}).trim()
const expectedTag = `v${publicPackage.version}`

if (rootPackage.version !== publicPackage.version) {
  throw new Error(
    `Workspace version ${rootPackage.version} does not match package version ${publicPackage.version}.`,
  )
}
if (tag !== expectedTag) {
  throw new Error(`Release tag ${tag} must equal ${expectedTag}.`)
}
if (publicPackage.private) {
  throw new Error('The public RCIP package must not be private.')
}
if (publicPackage.license !== 'Apache-2.0') {
  throw new Error('The RCIP package must use Apache-2.0.')
}
if (
  publicPackage.repository?.url !==
  'git+https://github.com/binariedus/rcip.git'
) {
  throw new Error('The package repository must match the trusted publisher.')
}
if (publicPackage.publishConfig?.access !== 'public') {
  throw new Error('The scoped RCIP package must publish with public access.')
}

process.stdout.write(`RCIP release metadata matches ${tag}.\n`)
