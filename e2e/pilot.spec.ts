import { expect, test } from '@playwright/test'

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

test('control panel is the default tool and preserves its draft across tabs', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('tab', { name: 'Control Panel' }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Capability control panel' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Semantic assistant' })).toBeHidden()

  await page.getByLabel('Capability input (JSON)').fill('{"draft": true}')
  await page.getByRole('tab', { name: 'AI Delegate' }).click()
  await expect(page.getByRole('heading', { name: 'Semantic assistant' })).toBeVisible()
  await page.getByRole('tab', { name: 'Control Panel' }).click()
  await expect(page.getByLabel('Capability input (JSON)')).toHaveValue(
    '{"draft": true}',
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

test('assistant adds a todo only after confirmation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'AI Delegate' }).click()
  await page
    .getByRole('button', { name: 'Add "Book flight tickets" to my todos' })
    .click()

  await expect(page.getByTestId('confirmation-card')).toBeVisible()
  await expect(
    page.locator('.todo-list').getByText('Book flight tickets'),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm and run' }).click()

  await expect(
    page.locator('.todo-list').getByText('Book flight tickets'),
  ).toBeVisible()
  await expect(page.getByTestId('agent-messages')).toContainText(
    'The new todo has been added.',
  )
  await expect(page.getByTestId('agent-adapter')).toHaveText('deterministic')
})

test('assistant resolves a unique todo before completing it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'AI Delegate' }).click()
  await page
    .getByRole('button', {
      name: 'Mark "Submit expense report" as completed',
    })
    .click()

  await expect(page.getByTestId('confirmation-card')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm and run' }).click()
  await expect(
    page.getByTestId('todo-todo-1').getByText('Submit expense report'),
  ).toHaveClass(/todo-completed/)
})

test('assistant asks for clarification when todo identity is ambiguous', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'AI Delegate' }).click()
  await page
    .getByRole('textbox', { name: 'Request', exact: true })
    .fill('Mark "Prepare pilot report" as completed')
  await page.getByRole('button', { name: 'Send request' }).click()

  await expect(page.getByTestId('agent-messages')).toContainText(
    'Please clarify which one you mean.',
  )
  await expect(page.getByTestId('confirmation-card')).toHaveCount(0)
  await expect(
    page.locator('.todo-list').getByText('Prepare pilot report'),
  ).toHaveCount(2)
})

test('destructive operation can be cancelled without changing state', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'AI Delegate' }).click()
  await page
    .getByRole('button', { name: 'Delete "Review security policy"' })
    .click()
  await expect(page.getByTestId('confirmation-card')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(
    page.getByTestId('todo-todo-2').getByText('Review security policy'),
  ).toBeVisible()
  await expect(page.getByTestId('agent-messages')).toContainText(
    'I cancelled that operation',
  )
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
