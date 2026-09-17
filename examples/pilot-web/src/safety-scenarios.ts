import {
  createRcipRuntime,
  defineRcipApplication,
  defineRcipCapability,
  defineRcipScope,
  RCIP_PROTOCOL_VERSION,
  type RcipInvocationOutcome,
  type RcipPolicyDecision,
  type RcipRuntimeOptions,
} from '@binaried/rcip/core'
import type { ContractMatrixResult } from './contract-matrix'

const scope = defineRcipScope({
  id: 'safety',
  title: 'Safety',
  description: 'Browser safety scenarios.',
})
const capability = defineRcipCapability<{ value: string }, { value: string }>({
  id: 'safety.write',
  title: 'Write a value',
  description: 'Capture exactly one value.',
  scopeIds: [scope.id],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: { value: { type: 'string' } },
    required: ['value'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: { value: { type: 'string' } },
    required: ['value'],
    additionalProperties: false,
  },
})
function runtime(options: RcipRuntimeOptions = {}) {
  return createRcipRuntime(
    defineRcipApplication({
      protocolVersion: RCIP_PROTOCOL_VERSION,
      application: {
        id: 'safety.browser',
        name: 'Browser safety',
        description: 'Composed pilot diagnostics.',
      },
      scopes: [scope],
      capabilities: [capability],
    }),
    { policy: () => ({ decision: 'allow' }), ...options },
  )
}
function gate() {
  let release: (decision: RcipPolicyDecision) => void = () => undefined
  const promise = new Promise<RcipPolicyDecision>((resolve) => {
    release = resolve
  })
  return { promise, release }
}
function label(outcome: RcipInvocationOutcome): string {
  return outcome.status === 'failed' || outcome.status === 'denied'
    ? outcome.error.code
    : outcome.status
}
const request = () => ({
  capabilityId: capability.id,
  input: { value: 'original' },
  invocationId: 'browser-operation',
})
const confirmationPolicy: RcipRuntimeOptions['policy'] = ({ confirmed }) => ({
  decision: confirmed ? 'allow' : 'confirm',
})

export async function runSafetyScenarios(): Promise<
  readonly ContractMatrixResult[]
> {
  const checks: ContractMatrixResult[] = []
  function check(id: string, expected: string, actual: string) {
    checks.push({
      id,
      title: id.replaceAll('-', ' '),
      expected,
      actual,
      passed: expected === actual,
    })
  }
  {
    const policy = gate()
    let executions = 0
    const host = runtime({ policy: () => policy.promise })
    host.host.bindCapability(capability, {
      execute: (input) => {
        executions++
        return input
      },
    })
    const first = host.client.invoke(request())
    const duplicate = await host.client.invoke(request())
    policy.release({ decision: 'allow' })
    await first
    check(
      'deferred-policy-duplicate',
      'INVOCATION_ALREADY_ACTIVE:1',
      `${label(duplicate)}:${executions}`,
    )
  }
  for (const change of ['unbind', 'rebind', 'availability', 'context']) {
    const policy = gate()
    let executions = 0
    let available = true
    const host = runtime({ policy: () => policy.promise })
    const binding = {
      execute: (input: { value: string }) => {
        executions++
        return input
      },
      getAvailability: () => ({ available }),
    }
    const unbind = host.host.bindCapability(capability, binding)
    const pending = host.client.invoke(request())
    if (change === 'unbind' || change === 'rebind') unbind()
    if (change === 'rebind') host.host.bindCapability(capability, binding)
    if (change === 'availability') available = false
    if (change === 'context')
      host.host.setContext({ activeScopeIds: [scope.id] })
    policy.release({ decision: 'allow' })
    const expected =
      change === 'context'
        ? 'POLICY_DENIED'
        : change === 'availability'
          ? 'CAPABILITY_UNAVAILABLE'
          : 'CAPABILITY_UNBOUND'
    check(
      `policy-${change}`,
      `${expected}:0`,
      `${label(await pending)}:${executions}`,
    )
  }
  {
    const policy = gate()
    const host = runtime({ policy: () => policy.promise })
    let value = ''
    host.host.bindCapability(capability, {
      execute: (input) => {
        value = input.value
        return input
      },
    })
    const input = request()
    const pending = host.client.invoke(input)
    input.input.value = 'changed'
    policy.release({ decision: 'allow' })
    await pending
    check('captured-policy-input', 'original', value)
  }
  {
    const host = runtime({ policy: confirmationPolicy })
    let value = ''
    host.host.bindCapability(capability, {
      execute: (input) => {
        value = input.value
        return input
      },
    })
    const input = request()
    const pending = await host.client.invoke(input)
    input.input.value = 'changed'
    input.capabilityId = 'safety.missing'
    if (pending.status === 'confirmation_required') {
      check(
        'pending-reservation',
        'INVOCATION_ALREADY_ACTIVE',
        label(await host.client.invoke(request())),
      )
      await host.host.resolveConfirmation(pending.confirmation.id, true)
      check('captured-confirmation-input', 'original', value)
      check(
        'confirmation-single-use',
        'CONFIRMATION_NOT_FOUND',
        label(
          await host.host.resolveConfirmation(pending.confirmation.id, true),
        ),
      )
    } else
      check(
        'captured-confirmation-input',
        'confirmation_required',
        label(pending),
      )
  }
  for (const termination of ['abort', 'expire', 'decline']) {
    const controller = new AbortController()
    const host = runtime({
      policy: confirmationPolicy,
      confirmationTtlMs: termination === 'expire' ? 5 : 120000,
    })
    host.host.bindCapability(capability, { execute: (input) => input })
    const pending = await host.client.invoke({
      ...request(),
      signal: controller.signal,
    })
    if (pending.status !== 'confirmation_required') {
      check(`pending-${termination}`, 'confirmation_required', label(pending))
      continue
    }
    if (termination === 'abort') controller.abort()
    if (termination === 'expire')
      await new Promise((resolve) => setTimeout(resolve, 15))
    const completed = await host.host.resolveConfirmation(
      pending.confirmation.id,
      termination !== 'decline',
    )
    const expected =
      termination === 'abort'
        ? 'EXECUTION_ABORTED'
        : termination === 'expire'
          ? 'CONFIRMATION_EXPIRED'
          : 'CONFIRMATION_DECLINED'
    check(`pending-${termination}`, expected, label(completed))
    const next = await host.client.invoke(request())
    check(
      `reservation-released-${termination}`,
      'confirmation_required',
      label(next),
    )
    if (next.status === 'confirmation_required')
      await host.host.resolveConfirmation(next.confirmation.id, false)
  }
  {
    const host = runtime({ policy: confirmationPolicy })
    let executions = 0
    host.host.bindCapability(capability, {
      execute: (input) => {
        executions++
        return input
      },
    })
    const pending = await host.client.invoke(request())
    host.host.setContext({ activeScopeIds: [scope.id] })
    if (pending.status === 'confirmation_required') {
      check(
        'confirmation-context-change',
        'POLICY_DENIED:0',
        `${label(await host.host.resolveConfirmation(pending.confirmation.id, true))}:${executions}`,
      )
    }
  }
  {
    const host = runtime()
    host.host.bindCapability(capability, { execute: (input) => input })
    const snapshot = host.client.getSnapshot()
    try {
      Reflect.set(
        snapshot.capabilities[0].inputSchema as object,
        'type',
        'number',
      )
    } catch {
      /* immutable contract */
    }
    try {
      Reflect.set(snapshot.capabilities[0], 'available', false)
    } catch {
      /* immutable snapshot */
    }
    check(
      'snapshot-stable',
      'true',
      String(snapshot === host.client.getSnapshot()),
    )
    check(
      'snapshot-isolation',
      'succeeded',
      label(await host.client.invoke(request())),
    )
    const invalid = { ...request(), input: { value: Number.NaN } }
    check(
      'non-json-input',
      'INPUT_INVALID',
      label(await host.client.invoke(invalid)),
    )
  }
  {
    const controller = new AbortController()
    const host = runtime()
    host.host.bindCapability(capability, {
      execute: (input) => {
        controller.abort()
        return input
      },
    })
    check(
      'completed-effect-after-abort',
      'succeeded',
      label(
        await host.client.invoke({ ...request(), signal: controller.signal }),
      ),
    )
  }
  {
    const host = runtime()
    host.host.bindCapability(capability, {
      execute: () => ({ value: undefined }) as never,
    })
    check(
      'non-json-output',
      'OUTPUT_INVALID',
      label(await host.client.invoke(request())),
    )
  }
  {
    const policy = gate()
    const controller = new AbortController()
    let evaluations = 0
    let executions = 0
    const host = runtime({
      policy: () =>
        ++evaluations === 1 ? policy.promise : { decision: 'allow' },
    })
    host.host.bindCapability(capability, {
      execute: (input) => {
        executions++
        return input
      },
    })
    const first = host.client.invoke({
      ...request(),
      signal: controller.signal,
    })
    controller.abort()
    check('abort-policy-wait', 'EXECUTION_ABORTED', label(await first))
    check(
      'abort-policy-reservation',
      'succeeded',
      label(await host.client.invoke(request())),
    )
    policy.release({ decision: 'allow' })
    await Promise.resolve()
    check('late-policy-does-not-execute', '1', String(executions))
  }
  {
    const schema = {
      $id: 'https://example.test/rcip/shared-value',
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      additionalProperties: false,
    }
    const definitions = ['first', 'second'].map((suffix) =>
      defineRcipCapability<{ value: string }, { value: string }>({
        ...capability,
        id: `safety.${suffix}`,
        inputSchema: schema,
        outputSchema: schema,
        usage: {
          whenToUse: 'Read one value.',
          examples: [{ description: 'A value', input: { value: 'example' } }],
        },
      }),
    )
    const host = createRcipRuntime(
      defineRcipApplication({
        protocolVersion: RCIP_PROTOCOL_VERSION,
        application: {
          id: 'safety.schemas',
          name: 'Schema reuse',
          description: 'Shared named schema.',
        },
        scopes: [scope],
        capabilities: definitions,
      }),
      { policy: () => ({ decision: 'allow' }) },
    )
    for (const definition of definitions)
      host.host.bindCapability(definition, { execute: (input) => input })
    const outcomes = await Promise.all(
      definitions.map((definition) =>
        host.client.invoke({
          capabilityId: definition.id,
          input: { value: 'original' },
        }),
      ),
    )
    check(
      'shared-named-schema',
      'succeeded,succeeded',
      outcomes.map(label).join(','),
    )
  }
  return checks
}
