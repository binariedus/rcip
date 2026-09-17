import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { chromium } from '@playwright/test'
import { checkConsumerBrowser } from './check-consumer-browser.mjs'

// A real consumer outside the workspace: npm cannot substitute local RCIP source.
const target = mkdtempSync(join(tmpdir(), 'rcip-react-starter-'))
let browser
try {
  cpSync('templates/react-starter', target, {
    recursive: true,
    filter: (path) => !['node_modules', 'dist', '.git'].includes(basename(path)),
  })
  for (const args of [['ci', '--no-audit', '--no-fund'], ['run', 'build']]) {
    const result = spawnSync('npm', args, { cwd: target, stdio: 'inherit', timeout: 300_000 })
    if (result.error || result.status !== 0) throw new Error(`Starter npm ${args.join(' ')} failed.`)
  }
  const expected = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8')).dependencies['@binaried/rcip']
  const actual = JSON.parse(readFileSync(join(target, 'node_modules/@binaried/rcip/package.json'), 'utf8')).version
  if (expected !== actual) throw new Error(`Starter version mismatch: ${expected} vs ${actual}`)
  browser = await chromium.launch()
  await checkConsumerBrowser(browser, target, { cancellation: true })
  console.log(`PASS standalone starter: registry RCIP ${actual}; build, discovery, live reads, validation, approval, decline, cancellation, mobile layout`)
} finally {
  await browser?.close()
  rmSync(target, { recursive: true, force: true })
}
