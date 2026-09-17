import { expect, test } from '@playwright/test'

test('SSR requests are isolated and hydrate without warnings under Strict Mode', async ({
  page,
  request,
}) => {
  const [first, second] = await Promise.all([
    request.get('/__ssr?name=First'),
    request.get('/__ssr?name=Second'),
  ])
  expect(first.ok()).toBe(true)
  expect(second.ok()).toBe(true)
  const firstHtml = await first.text()
  const secondHtml = await second.text()
  expect(firstHtml).toContain('First')
  expect(firstHtml).not.toContain('Second')
  expect(secondHtml).toContain('Second')
  expect(firstHtml).toContain('false<!-- -->:<!-- -->false')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/__ssr?name=Hydrated')
  await expect(page.getByTestId('binding-status')).toHaveText('true:true')
  await page.getByRole('button', { name: 'Increment state' }).click()
  await page.getByRole('button', { name: 'Invoke fixture' }).click()
  await expect(page.getByTestId('lifecycle-outcome')).toContainText('"value":1')
  await page.getByRole('button', { name: 'Toggle binding' }).click()
  await expect(page.getByTestId('binding-status')).toHaveText('false:false')
  await page.getByRole('button', { name: 'Invoke fixture' }).click()
  await expect(page.getByTestId('lifecycle-outcome')).toContainText(
    'CAPABILITY_UNBOUND',
  )
  await page.getByRole('button', { name: 'Toggle binding' }).click()
  await expect(page.getByTestId('binding-status')).toHaveText('true:true')
  await page.getByRole('button', { name: 'Toggle availability' }).click()
  await expect(page.getByTestId('binding-status')).toHaveText('true:false')
  await page.getByRole('button', { name: 'Invoke fixture' }).click()
  await expect(page.getByTestId('lifecycle-outcome')).toContainText(
    'CAPABILITY_UNAVAILABLE',
  )
  expect(errors).toEqual([])
})
