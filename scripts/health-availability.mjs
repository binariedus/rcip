import { checkSite, healthOptions, publishedVersion, runHealth } from './health-common.mjs'

await runHealth(async () => {
  const options = healthOptions()
  await publishedVersion(options)
  await checkSite(options.siteUrl)
})
