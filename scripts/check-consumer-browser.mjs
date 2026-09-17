import { preview } from 'vite'
import { expect } from '@playwright/test'

export async function checkConsumerBrowser(browser, fixtureRoot, { cancellation = false } = {}) {
  const server = await preview({
    root: fixtureRoot, configFile: false,
    preview: { host: '127.0.0.1', port: 0 },
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(server.resolvedUrls.local[0])
    const count = page.getByTestId('count')
    const result = page.getByTestId('result')
    await expect(count).toHaveText('Count: 0')
    await page.getByRole('button', { name: 'Discover', exact: true }).click()
    await expect(result).toContainText('counter.read')
    await expect(result).toContainText('counter.increment')
    await page.getByRole('button', { name: 'Increment in UI', exact: true }).click()
    await expect(count).toHaveText('Count: 1')
    await page.getByRole('button', { name: 'Read through RCIP', exact: true }).click()
    await expect(result).toContainText(/"status"\s*:\s*"succeeded"/)
    expect(JSON.parse(await result.textContent()).output).toEqual({ count: 1 })
    await page.getByRole('button', { name: 'Send invalid input', exact: true }).click()
    await expect(result).toContainText('INPUT_INVALID')
    await expect(count).toHaveText('Count: 1')
    await page.getByRole('button', { name: 'Increment through RCIP', exact: true }).click()
    await expect(result).toContainText('confirmation_required')
    await expect(count).toHaveText('Count: 1')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    await expect(result).toContainText('CONFIRMATION_DECLINED')
    await expect(count).toHaveText('Count: 1')
    if (cancellation) {
      await page.getByRole('button', { name: 'Increment through RCIP', exact: true }).click()
      await page.getByRole('button', { name: 'Cancel request', exact: true }).click()
      await expect(result).toContainText('Request cancelled before approval')
      await expect(count).toHaveText('Count: 1')
      await expect(page.getByRole('region', { name: 'Host confirmation' })).toHaveCount(0)
    }
    await page.getByRole('button', { name: 'Increment through RCIP', exact: true }).click()
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(result).toContainText(/"status"\s*:\s*"succeeded"/)
    await expect(count).toHaveText('Count: 2')
    await page.getByRole('button', { name: 'Read through RCIP', exact: true }).click()
    await expect.poll(async () => JSON.parse(await result.textContent()).capabilityId).toBe('counter.read')
    expect(JSON.parse(await result.textContent()).output).toEqual({ count: 2 })
    if (cancellation) {
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
    expect(errors).toEqual([])
  } finally {
    await page.close()
    await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
  }
}
