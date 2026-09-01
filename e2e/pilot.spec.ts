import { expect, test, type Page } from '@playwright/test'

async function openAssist(page: Page): Promise<void> {
  await page.locator('.rcip-assist__dot').dblclick()
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toBeVisible()
}

test('discovers scopes and tracks the current semantic context', async ({
  page,
}) => {
  await page.goto('/')
  const explorer = page.locator('[data-rcip-explorer]')
  await expect(explorer.locator('[data-rcip-current-scope]')).toHaveText('todos')
  await expect(explorer.locator('[data-rcip-capability-id]')).toHaveCount(8)
  await expect(
    explorer.locator('[data-rcip-capability-id="profile.export"]'),
  ).toContainText('Unbound')
  await expect(
    explorer.getByRole('button', { name: 'Invoke capability' }),
  ).toHaveCount(0)

  await explorer.getByRole('button', { name: 'Active now' }).click()
  await expect(explorer.locator('[data-rcip-capability-id]')).toHaveCount(5)
  await expect(
    explorer.locator('[data-rcip-relevance="other"]'),
  ).toHaveCount(0)
  await explorer.getByRole('button', { name: 'All capabilities' }).click()

  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(explorer.locator('[data-rcip-current-scope]')).toHaveText('profile')
  await expect(
    explorer.locator('[data-rcip-capability-id="profile.update"]'),
  ).toHaveAttribute('data-rcip-relevance', 'current')
  await expect(
    explorer.locator('[data-rcip-capability-id="todos.create"]'),
  ).toHaveAttribute('data-rcip-relevance', 'other')
  await expect(explorer).toContainText('Protocol 1.0')
})

test('capability explorer remains usable at a narrow mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const explorer = page.locator('[data-rcip-explorer]')
  await explorer.getByRole('button', { name: 'Active now' }).click()
  await expect(explorer.locator('[data-rcip-capability-id]')).toHaveCount(5)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true)
})

test('normal UI works without using the semantic assistant', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New todo').fill('Buy printer paper')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Buy printer paper')).toBeVisible()

  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await page.getByLabel('Display name').fill('Jordan Lee')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByLabel('Display name')).toHaveValue('Jordan Lee')
})

test('the SDK workbench and shipped floating assistant remain independent', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Capability control panel' }),
  ).toBeVisible()
  await expect(page.locator('.rcip-assist__dot')).toBeVisible()

  await page.getByLabel('Capability input (JSON)').fill('{"draft": true}')
  await openAssist(page)
  await expect(page.getByLabel('Capability input (JSON)')).toHaveValue(
    '{"draft": true}',
  )
  await page.getByRole('button', { name: 'Close RCIP Assist' }).click()
  await expect(page.locator('.rcip-assist__dot')).toBeVisible()
})

test('collapsed Assist distinguishes voice input from opening chat', async ({
  page,
}) => {
  const decideRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/agent/decide')) {
      decideRequests.push(request.url())
    }
  })
  await page.goto('/')

  const assist = page.locator('[data-rcip-assist]')
  const dot = assist.locator('.rcip-assist__dot')
  await dot.click()
  await expect(assist).toHaveAttribute(
    'data-rcip-assist-input-status',
    'listening',
  )
  await expect(dot).toHaveAttribute('aria-pressed', 'true')

  await dot.click()
  await expect(assist).toHaveAttribute(
    'data-rcip-assist-input-status',
    'processing',
  )
  await expect(assist).toHaveAttribute('data-rcip-assist-input-status', 'idle', {
    timeout: 3_000,
  })
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toHaveCount(0)
  expect(decideRequests).toEqual([])

  await dot.dblclick()
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toBeVisible()
})

test('keyboard controls expose chat and simulated voice without pointer gestures', async ({
  page,
}) => {
  await page.goto('/')
  const dot = page.locator('.rcip-assist__dot')
  await dot.focus()
  await dot.press('Enter')
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toBeVisible()
  await page.getByRole('button', { name: 'Close RCIP Assist' }).click()
  await expect(dot).toBeFocused()

  await dot.press('Space')
  await expect(page.locator('[data-rcip-assist]')).toHaveAttribute(
    'data-rcip-assist-input-status',
    'listening',
  )
})

test('disabled voice reports unavailability without changing chat gestures', async ({
  page,
}) => {
  await page.goto('/?voicePipeline=disabled')
  const assist = page.locator('[data-rcip-assist]')
  const dot = assist.locator('.rcip-assist__dot')

  await dot.click()
  await expect(assist.locator('.rcip-assist__launcher-hint')).toHaveText(
    'Voice input isn’t available right now',
  )
  await expect(assist.locator('.rcip-assist__launcher-hint')).toHaveAttribute(
    'data-visible',
    'true',
  )
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toHaveCount(0)
  await expect(assist).toHaveAttribute('data-rcip-assist-input-status', 'idle')

  await dot.press('Space')
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toHaveCount(0)
  await expect(dot).toHaveAttribute('aria-label', /Voice input unavailable/)

  await dot.dblclick()
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Start voice input' }),
  ).toHaveCount(0)
})

test('closing a dragged panel restores the launcher anchor', async ({ page }) => {
  await page.goto('/')
  const dot = page.locator('.rcip-assist__dot')
  const originalBox = await dot.boundingBox()
  expect(originalBox).not.toBeNull()

  await openAssist(page)
  const header = page.locator('.rcip-assist__header')
  const headerBox = await header.boundingBox()
  expect(headerBox).not.toBeNull()
  if (!headerBox) return
  await page.mouse.move(headerBox.x + 90, headerBox.y + 34)
  await page.mouse.down()
  await page.mouse.move(90, 120, { steps: 6 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Close RCIP Assist' }).click()

  const restoredBox = await dot.boundingBox()
  expect(restoredBox).not.toBeNull()
  if (!originalBox || !restoredBox) return
  expect(Math.abs(restoredBox.x - originalBox.x)).toBeLessThan(1)
  expect(Math.abs(restoredBox.y - originalBox.y)).toBeLessThan(1)
})

test('voice input runs ordered processors and auto-sends final text', async ({
  page,
}) => {
  await page.goto('/?voicePipeline=fixture')
  const assist = page.locator('[data-rcip-assist]')
  const dot = assist.locator('.rcip-assist__dot')

  await dot.click()
  await expect(assist).toHaveAttribute(
    'data-rcip-assist-input-status',
    'listening',
  )
  await dot.click()

  await expect(page.getByTestId('input-pipeline-trace')).toHaveText(
    'capture:start → capture:stop → processor:transcribe → processor:refine',
  )
  await openAssist(page)
  await expect(page.locator('[data-rcip-assist-messages]')).toContainText(
    'I retrieved your current todos.',
  )
  await expect(page.locator('.rcip-assist__message--user')).toContainText(
    'list my todos',
  )
})

test('composer text also passes through the configured input pipeline', async ({
  page,
}) => {
  await page.goto('/?voicePipeline=fixture')
  await openAssist(page)
  await page.getByLabel('Request', { exact: true }).fill('show my todos')
  await page.getByRole('button', { name: 'Send request' }).click()

  await expect(page.getByTestId('input-pipeline-trace')).toHaveText(
    'processor:transcribe → processor:refine',
  )
  await expect(page.locator('.rcip-assist__message--user')).toContainText(
    'list my todos',
  )
})

test('control panel invokes a read capability and exposes the SDK outcome', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('console-capability-todos.list').click()
  await page.getByRole('button', { name: 'Invoke capability' }).click()

  await expect(page.getByTestId('console-outcome')).toHaveText('succeeded')
  await expect(page.getByTestId('console-result')).toContainText(
    'Submit expense report',
  )
})

test('control panel runs a write only after host confirmation', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('console-capability-todos.create').click()
  await page.getByRole('button', { name: 'Invoke capability' }).click()

  await expect(page.getByTestId('console-confirmation')).toBeVisible()
  await expect(
    page.locator('.todo-list').getByText('Book train tickets'),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm capability' }).click()

  await expect(
    page.locator('.todo-list').getByText('Book train tickets'),
  ).toBeVisible()
  await expect(page.getByTestId('console-outcome')).toHaveText('succeeded')
})

test('control panel cancellation leaves destructive state unchanged', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('console-capability-todos.delete').click()
  await page.getByRole('button', { name: 'Invoke capability' }).click()
  await expect(page.getByTestId('console-confirmation')).toBeVisible()
  await page
    .getByTestId('console-confirmation')
    .getByRole('button', { name: 'Cancel' })
    .click()

  await expect(page.getByTestId('todo-todo-2')).toContainText(
    'Review security policy',
  )
  await expect(page.getByTestId('console-outcome')).toHaveText(
    'denied: CONFIRMATION_DECLINED',
  )
})

test('control panel distinguishes malformed JSON from SDK input validation', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('console-capability-todos.create').click()
  await page.getByLabel('Capability input (JSON)').fill('{')
  await page.getByRole('button', { name: 'Invoke capability' }).click()

  await expect(page.getByRole('alert')).toHaveText(
    'Enter valid JSON before invoking the capability.',
  )
  await expect(page.getByTestId('console-outcome')).toHaveCount(0)

  await page.getByLabel('Capability input (JSON)').fill('{}')
  await page.getByRole('button', { name: 'Invoke capability' }).click()
  await expect(page.getByTestId('console-outcome')).toHaveText(
    'failed: INPUT_INVALID',
  )
})

test('control panel demonstrates an advertised but unbound capability', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('console-capability-profile.export').click()
  await page.getByRole('button', { name: 'Invoke capability' }).click()

  await expect(page.getByTestId('console-outcome')).toHaveText(
    'failed: CAPABILITY_UNBOUND',
  )
})

test('shipped assistant adds a todo only after host confirmation', async ({ page }) => {
  await page.goto('/')
  await openAssist(page)
  await expect(page.getByText('Try asking', { exact: true })).toHaveCount(0)
  await page
    .getByLabel('Request', { exact: true })
    .fill('Add "Book flight tickets" to my todos')
  await page.getByRole('button', { name: 'Send request' }).click()

  await expect(page.locator('[data-rcip-assist-confirmation]')).toBeVisible()
  await expect(
    page.locator('.todo-list').getByText('Book flight tickets'),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm and run' }).click()

  await expect(
    page.locator('.todo-list').getByText('Book flight tickets'),
  ).toBeVisible()
  await expect(page.locator('[data-rcip-assist-messages]')).toContainText(
    'The new todo has been added.',
  )
})

test('shipped assistant completes a uniquely identified pilot todo', async ({ page }) => {
  await page.goto('/')
  await openAssist(page)
  await page.getByLabel('Request', { exact: true }).fill(
    'Mark "Submit expense report" as completed',
  )
  await page.getByRole('button', { name: 'Send request' }).click()

  await expect(page.locator('[data-rcip-assist-confirmation]')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm and run' }).click()
  await expect(
    page.getByTestId('todo-todo-1').getByText('Submit expense report'),
  ).toHaveClass(/todo-completed/)
})

test('assistant asks for clarification when todo identity is ambiguous', async ({
  page,
}) => {
  await page.goto('/')
  await openAssist(page)
  await page
    .getByRole('textbox', { name: 'Request', exact: true })
    .fill('Mark "Prepare pilot report" as completed')
  await page.getByRole('button', { name: 'Send request' }).click()

  await expect(page.locator('[data-rcip-assist-messages]')).toContainText(
    'Please clarify which one you mean.',
  )
  await expect(page.locator('[data-rcip-assist-confirmation]')).toHaveCount(0)
  await expect(
    page.locator('.todo-list').getByText('Prepare pilot report'),
  ).toHaveCount(2)
})

test('destructive operation can be cancelled without changing state', async ({
  page,
}) => {
  await page.goto('/')
  await openAssist(page)
  await page.getByLabel('Request', { exact: true }).fill(
    'Delete "Review security policy"',
  )
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.locator('[data-rcip-assist-confirmation]')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(
    page.getByTestId('todo-todo-2').getByText('Review security policy'),
  ).toBeVisible()
  await expect(page.locator('[data-rcip-assist-messages]')).toContainText(
    'I cancelled that operation',
  )
})

test('read-only mode rejects a proposed write before invoking the host', async ({
  page,
}) => {
  await page.goto('/?assistMode=read-only')
  await openAssist(page)
  await page
    .getByLabel('Request', { exact: true })
    .fill('Add "Book flight tickets" to my todos')
  await page.getByRole('button', { name: 'Send request' }).click()

  await expect(page.locator('[data-rcip-assist-confirmation]')).toHaveCount(0)
  await expect(page.locator('[data-rcip-assist-messages]')).toContainText(
    'read-only mode denied',
  )
  await expect(
    page.locator('.todo-list').getByText('Book flight tickets'),
  ).toHaveCount(0)
})

test('assistant executes one ordered batch and summarizes once', async ({ page }) => {
  await page.goto('/')
  await openAssist(page)
  await page.getByLabel('Request', { exact: true }).fill(
    'Add "Pack passport" to my todos and show my profile',
  )
  await page.getByRole('button', { name: 'Send request' }).click()
  await page.getByRole('button', { name: 'Confirm and run' }).click()
  await expect(
    page.locator('.todo-list').getByText('Pack passport'),
  ).toBeVisible()
  await expect(page.locator('[data-rcip-assist-messages]')).toContainText(
    '2 requested actions completed successfully.',
  )
})

test('floating assistant remains usable and contained on a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await openAssist(page)
  await expect(page.getByRole('dialog', { name: 'RCIP Assist' })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true)
})

test('runtime rejects invalid input and advertised but unbound capabilities', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Reject invalid input' }).click()
  await expect(page.getByTestId('diagnostic-outcome')).toHaveText(
    'failed: INPUT_INVALID',
  )

  await page.getByRole('button', { name: 'Reject unbound capability' }).click()
  await expect(page.getByTestId('diagnostic-outcome')).toHaveText(
    'failed: CAPABILITY_UNBOUND',
  )
})

test('browser-driven runtime contract matrix passes every safety path', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run contract matrix' }).click()

  const matrix = page.getByTestId('contract-matrix')
  await expect(matrix.locator('[data-contract-check]')).toHaveCount(13)
  await expect(
    matrix.locator('[data-contract-passed="false"]'),
  ).toHaveCount(0)
  await expect(
    matrix.locator('[data-contract-check="confirmation-expired"]'),
  ).toContainText('CONFIRMATION_EXPIRED')
  await expect(
    matrix.locator('[data-contract-check="duplicate"]'),
  ).toContainText('INVOCATION_ALREADY_ACTIVE')
  await expect(
    matrix.locator('[data-contract-check="observer"]'),
  ).toContainText('succeeded')
})
