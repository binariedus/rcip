import { appendFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'

export const registry = 'https://registry.npmjs.org'
export const packageName = '@binaried/rcip'
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/

export function healthOptions() {
  const { values } = parseArgs({ options: {
    version: { type: 'string', default: 'latest' },
    'wait-seconds': { type: 'string', default: '0' },
    'site-url': { type: 'string', default: 'https://binariedus.github.io' },
  } })
  if (values.version !== 'latest' && !versionPattern.test(values.version)) {
    throw new Error('--version must be latest or an exact semantic version.')
  }
  const waitSeconds = Number(values['wait-seconds'])
  if (!Number.isInteger(waitSeconds) || waitSeconds < 0 || waitSeconds > 600) {
    throw new Error('--wait-seconds must be an integer from 0 to 600.')
  }
  const site = new URL(values['site-url'])
  if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new Error('--site-url must be an HTTP(S) origin without credentials, path, query, or fragment.')
  }
  return { version: values.version, waitSeconds, siteUrl: site.origin }
}

export function report(message) {
  console.log(message)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`)
  }
}

export async function requestText(url, accept = '*/*') {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        redirect: 'error',
        headers: { Accept: accept, 'User-Agent': 'rcip-public-health', 'Cache-Control': 'no-cache' },
      })
      if (response.ok) return { text: await response.text(), type: response.headers.get('content-type') ?? '' }
    } catch (error) {
      if (attempt === 1) throw new Error(`Request failed: ${url}: ${error.message}`)
      response = undefined
    }
    if (response) {
      await response.body?.cancel()
      if (attempt === 1 || (response.status !== 429 && response.status < 500)) {
        throw new Error(`HTTP ${response.status}: ${url}`)
      }
    }
    await delay(1_000)
  }
  throw new Error(`Request failed: ${url}`)
}

export async function publishedVersion({ version = 'latest', waitSeconds = 0 } = {}) {
  const deadline = Date.now() + waitSeconds * 1_000
  const url = `${registry}/@binaried%2frcip`
  while (true) {
    const response = await requestText(url, 'application/vnd.npm.install-v1+json')
    const metadata = JSON.parse(response.text)
    const resolved = version === 'latest' ? metadata['dist-tags']?.latest : version
    const entry = metadata.versions?.[resolved]
    if (entry) {
      const tarball = new URL(entry.dist?.tarball)
      if (metadata.name !== packageName || entry.name !== packageName || entry.version !== resolved || !versionPattern.test(resolved) || tarball.origin !== registry || !entry.dist?.integrity) {
        throw new Error('Registry returned inconsistent RCIP version or distribution metadata.')
      }
      report(`PASS registry: ${packageName}@${resolved} (${url})`)
      return entry
    }
    if (Date.now() >= deadline) throw new Error(`Registry version ${version} is not available.`)
    console.log(`Waiting for registry metadata for ${version}; no package download attempted.`)
    await delay(Math.min(15_000, deadline - Date.now()))
  }
}

export async function checkSite(siteUrl) {
  const assets = new Set()
  for (const [path, marker, type] of [
    ['/rcip/', 'React Capability Interface Protocol', 'text/html'],
    ['/rcip/quick-start.html', 'Add your first capability', 'text/html'],
    ['/rcip/demo/', 'Interactive RCIP demo', 'text/html'],
    ['/rcip/sitemap.xml', '/rcip/quick-start.html', 'xml'],
  ]) {
    const url = new URL(path, siteUrl)
    const response = await requestText(url)
    if (!response.type.includes(type) || !response.text.includes(marker)) {
      throw new Error(`Unexpected content at ${url}`)
    }
    if (type === 'text/html') {
      for (const match of response.text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
        const asset = new URL(match[1], url)
        if (asset.origin === url.origin) assets.add(asset.href)
      }
    }
    report(`PASS public page: ${url}`)
  }
  if (assets.size === 0) throw new Error('No JavaScript or CSS assets were found in the public pages.')
  for (const url of assets) {
    const response = await requestText(url)
    const expected = new URL(url).pathname.endsWith('.css') ? 'text/css' : /(?:java|ecma)script/
    if (!response.text.trim() || (typeof expected === 'string' ? !response.type.includes(expected) : !expected.test(response.type))) {
      throw new Error(`Unexpected asset content at ${url}`)
    }
  }
  report(`PASS public assets: ${assets.size} JavaScript/CSS resources`)
}

export async function runHealth(action) {
  const started = Date.now()
  try {
    // Recheck at execution time: an Actions job may queue beyond the window guard.
    if (process.env.RCIP_HEALTH_UNTIL) {
      const expiry = Date.parse(process.env.RCIP_HEALTH_UNTIL)
      if (!Number.isFinite(expiry)) throw new Error('Invalid RCIP_HEALTH_UNTIL.')
      if (Date.now() >= expiry) {
        report(`SKIP scheduled health window expired at ${process.env.RCIP_HEALTH_UNTIL}`)
        return
      }
    }
    await action()
    report(`PASS completed in ${((Date.now() - started) / 1_000).toFixed(1)}s`)
  } catch (error) {
    report(`FAIL ${error.message}`)
    process.exitCode = 1
  }
}
