import { useState } from 'react'
import {
  createRcipRuntime,
  defineRcipApplication,
  defineRcipCapability,
  RCIP_PROTOCOL_VERSION,
  type RcipRuntime,
} from '@binaried/rcip/core'
import {
  RcipProvider,
  useRcipCapability,
  useRcipClient,
  useRcipSnapshot,
} from '@binaried/rcip/react'

const read = defineRcipCapability<Record<string, never>, { value: number }>({
  id: 'lifecycle.read',
  title: 'Read fixture',
  description: 'Read committed state.',
  effect: 'read',
  scopeIds: [],
  inputSchema: { type: 'object', additionalProperties: false },
  outputSchema: {
    type: 'object',
    properties: { value: { type: 'number' } },
    required: ['value'],
    additionalProperties: false,
  },
})
export function createFixtureRuntime(name = 'Browser') {
  return createRcipRuntime(
    defineRcipApplication({
      protocolVersion: RCIP_PROTOCOL_VERSION,
      application: {
        id: 'lifecycle.fixture',
        name,
        description: 'Request-isolated lifecycle fixture.',
      },
      scopes: [],
      capabilities: [read],
    }),
  )
}
function Binding({ value, available }: { value: number; available: boolean }) {
  useRcipCapability(read, {
    execute: () => ({ value }),
    getAvailability: () => ({ available }),
    revision: `${value}:${available}`,
  })
  return null
}
function FixtureBody() {
  const [mounted, setMounted] = useState(true)
  const [available, setAvailable] = useState(true)
  const [value, setValue] = useState(0)
  const [outcome, setOutcome] = useState('')
  const snapshot = useRcipSnapshot()
  const client = useRcipClient()
  return (
    <main>
      <h1>Lifecycle fixture: {snapshot.application.name}</h1>
      {mounted ? <Binding value={value} available={available} /> : null}
      <output data-testid="binding-status">
        {String(snapshot.capabilities[0].bound)}:
        {String(snapshot.capabilities[0].available)}
      </output>
      <button onClick={() => setMounted(!mounted)}>Toggle binding</button>
      <button onClick={() => setAvailable(!available)}>
        Toggle availability
      </button>
      <button onClick={() => setValue(value + 1)}>Increment state</button>
      <button
        onClick={async () =>
          setOutcome(
            JSON.stringify(
              await client.invoke({ capabilityId: read.id, input: {} }),
            ),
          )
        }
      >
        Invoke fixture
      </button>
      <output data-testid="lifecycle-outcome">{outcome}</output>
    </main>
  )
}
export function LifecycleFixture({ runtime }: { runtime: RcipRuntime }) {
  return (
    <RcipProvider runtime={runtime}>
      <FixtureBody />
    </RcipProvider>
  )
}
