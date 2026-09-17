import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipApplication,
  defineRcipCapability,
  type RcipInvocationOutcome,
} from '@binaried/rcip/core'
import { RcipProvider, useRcipCapability, useRcipClient } from '@binaried/rcip/react'
import { RcipCapabilityExplorer } from '@binaried/rcip/explorer'
import { RcipAssist, type RcipAssistDecide } from '@binaried/rcip/assist'
import '@binaried/rcip/explorer/styles.css'
import '@binaried/rcip/assist/styles.css'

if (RCIP_PROTOCOL_VERSION !== '1.0') throw new Error('Unexpected protocol.')

const outputSchema = {
  type: 'object', properties: { count: { type: 'integer' } },
  required: ['count'], additionalProperties: false,
}
const readCount = defineRcipCapability<Record<string, never>, { count: number }>({
  id: 'counter.read', title: 'Read count', description: 'Read the current counter.',
  scopeIds: [], effect: 'read',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  outputSchema,
})
const increment = defineRcipCapability<{ by: number }, { count: number }>({
  id: 'counter.increment', title: 'Increment count', description: 'Increment after host confirmation.',
  scopeIds: [], effect: 'write',
  inputSchema: {
    type: 'object', properties: { by: { type: 'integer', minimum: 1, maximum: 3 } },
    required: ['by'], additionalProperties: false,
  },
  outputSchema,
})
const definition = defineRcipApplication({
  protocolVersion: RCIP_PROTOCOL_VERSION,
  application: { id: 'consumer.fixture', name: 'Consumer fixture', description: 'Published package verification.' },
  scopes: [], capabilities: [readCount, increment],
})
const decide: RcipAssistDecide = async () => ({ type: 'message', message: 'Consumer verification.' })

function App() {
  const [runtime] = useState(() => createRcipRuntime(definition, {
    policy: ({ capability, confirmed }) => ({
      decision: capability.effect === 'read' || confirmed ? 'allow' : 'confirm',
    }),
  }))
  return <RcipProvider runtime={runtime}>
    <Counter resolveConfirmation={runtime.host.resolveConfirmation} />
    <RcipCapabilityExplorer client={runtime.client} />
    <RcipAssist runtime={runtime} decide={decide} />
  </RcipProvider>
}

function Counter({ resolveConfirmation }: {
  resolveConfirmation: (id: string, approved: boolean) => Promise<RcipInvocationOutcome>
}) {
  const [count, setCount] = useState(0)
  const [result, setResult] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const client = useRcipClient()
  useRcipCapability(readCount, { execute: () => ({ count }), revision: count })
  useRcipCapability(increment, {
    execute: ({ by }) => { setCount(count + by); return { count: count + by } },
    revision: count,
  })
  async function invoke(capabilityId: string, input: Record<string, number>) {
    const outcome = await client.invoke({ capabilityId, input })
    setResult(JSON.stringify(outcome))
    setPending(outcome.status === 'confirmation_required' ? outcome.confirmation.id : null)
  }
  async function resolve(approved: boolean) {
    if (!pending) return
    setResult(JSON.stringify(await resolveConfirmation(pending, approved)))
    setPending(null)
  }
  return <main>
    <h1>Published RCIP consumer</h1>
    <p data-testid="count">Count: {count}</p>
    <button onClick={() => setCount(count + 1)}>Increment in UI</button>
    <button onClick={() => setResult(JSON.stringify(client.listCapabilities()))}>Discover</button>
    <button onClick={() => void invoke(readCount.id, {})}>Read through RCIP</button>
    <button onClick={() => void invoke(increment.id, { by: 1 })}>Increment through RCIP</button>
    <button onClick={() => void invoke(increment.id, { by: -1 })}>Send invalid input</button>
    {pending && <section aria-label="Host confirmation">
      <button onClick={() => void resolve(false)}>Decline</button>
      <button onClick={() => void resolve(true)}>Approve</button>
    </section>}
    <output data-testid="result">{result}</output>
  </main>
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing root.')
createRoot(root).render(<StrictMode><App /></StrictMode>)
