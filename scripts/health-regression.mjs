import { spawnSync } from 'node:child_process'
import { checkSite, healthOptions, publishedVersion, report, runHealth } from './health-common.mjs'

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, timeout: 15 * 60_000 })
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${result.error?.message ?? result.status}`)
}

await runHealth(async () => {
  const options = healthOptions()
  const entry = await publishedVersion(options)
  run(process.execPath, ['scripts/check-consumers.mjs', '--registry-version', entry.version, '--browser'])
  report(`PASS registry consumers: ${entry.version}; React 18.2, 18.3, 19.1; imports, types, build, browser`)
  await checkSite(options.siteUrl)
  run('npm', ['run', 'test:site'], { ...process.env, RCIP_SITE_URL: options.siteUrl })
  report('PASS public browser: documentation/search, demo confirmation, mobile layout')
})
