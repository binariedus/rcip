import { expect, test } from '@playwright/test'

test('documentation is searchable, crawlable, and linked', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const path of [
    '',
    'quick-start.html',
    'api.html',
    'api-types.html',
    'lifecycle.html',
    'compatibility.html',
    'finance-case-study.html',
    'ecosystem.html',
    'changelog.html',
  ]) {
    const response = await request.get(`/rcip/${path}`)
    expect(response.ok(), path).toBe(true)
    const html = await response.text()
    expect(html).toContain('rel="canonical"')
    expect(html).toContain('application/ld+json')
    expect(html).not.toContain('noindex')
    expect(html).toContain('og:image')
  }
  const sitemap = await request.get('/rcip/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain(
    'https://binariedus.github.io/rcip/quick-start.html',
  )
  const image = await request.get('/rcip/social-card.png')
  expect(image.ok()).toBe(true)
  await page.goto('/rcip/')
  await expect(
    page.getByRole('heading', { name: /^React Capability Interface Protocol/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('searchbox').fill('confirmation')
  await expect(page.locator('.VPLocalSearchBox .result').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('static demo works without a backend and survives layout changes', async ({
  page,
}) => {
  const backendRequests: string[] = []
  const errors: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/')) backendRequests.push(request.url())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/rcip/demo/')
  await expect(
    page.getByText('Interactive example · no AI service connected'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Change layout' }).click()
  const launcher = page.getByRole('button', { name: /Assist/ }).first()
  await launcher.focus()
  await page.keyboard.press('Enter')
  await page.getByPlaceholder('Message Assist…').fill('add todo Buy milk')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(
    page.locator('.todo-list').getByText('Buy milk', { exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Confirm and run', exact: true })
    .click()
  await expect(
    page.locator('.todo-list').getByText('Buy milk', { exact: true }),
  ).toBeVisible()
  expect(backendRequests).toEqual([])
  expect(errors).toEqual([])
})

test('documentation and demo fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/rcip/', '/rcip/quick-start.html', '/rcip/demo/']) {
    await page.goto(path)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true)
  }
})
