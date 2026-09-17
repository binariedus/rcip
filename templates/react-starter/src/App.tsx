import { useEffect, useRef, useState } from 'react'
import { createRcipRuntime, type RcipInvocationOutcome } from '@binaried/rcip/core'
import { RcipProvider, useRcipCapability, useRcipClient } from '@binaried/rcip/react'
import { definition, increment, readCount } from './capabilities'

export default function App() {
  const [runtime] = useState(() => createRcipRuntime(definition, {
    policy: ({ capability, confirmed }) => ({
      decision: capability.effect === 'read' || confirmed ? 'allow' : 'confirm',
    }),
  }))
  return <RcipProvider runtime={runtime}>
    <Counter resolveConfirmation={runtime.host.resolveConfirmation} />
  </RcipProvider>
}

function Counter({ resolveConfirmation }: {
  resolveConfirmation: (id: string, approved: boolean) => Promise<RcipInvocationOutcome>
}) {
  const client = useRcipClient()
  const [count, setCount] = useState(0)
  const [result, setResult] = useState('Discover the capabilities to get started.')
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  useRcipCapability(readCount, { execute: () => ({ count }), revision: count })
  useRcipCapability(increment, {
    execute: ({ by }) => {
      const next = count + by
      setCount(next)
      return { count: next }
    },
    revision: count,
  })

  async function invoke(capabilityId: string, input: Record<string, number>) {
    setBusy(true)
    controller.current = new AbortController()
    try {
      const outcome = await client.invoke({ capabilityId, input, signal: controller.current.signal })
      setResult(JSON.stringify(outcome, null, 2))
      setPending(outcome.status === 'confirmation_required' ? outcome.confirmation.id : null)
    } finally {
      setBusy(false)
    }
  }

  async function resolve(approved: boolean) {
    if (!pending) return
    setBusy(true)
    try {
      setResult(JSON.stringify(await resolveConfirmation(pending, approved), null, 2))
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    controller.current?.abort()
    setPending(null)
    setResult('Request cancelled before approval. No write was started.')
  }

  return <main>
    <p className="eyebrow">RCIP · React starter</p>
    <h1>One state. Two ways to use it.</h1>
    <p>Use the visible UI or a typed capability. The application owns execution.</p>
    <p className="count" data-testid="count">Count: {count}</p>
    <div className="actions">
      <button disabled={busy || !!pending} onClick={() => setCount(count + 1)}>Increment in UI</button>
      <button disabled={busy || !!pending} onClick={() => setResult(JSON.stringify(client.listCapabilities(), null, 2))}>Discover</button>
      <button disabled={busy || !!pending} onClick={() => void invoke(readCount.id, {})}>Read through RCIP</button>
      <button disabled={busy || !!pending} onClick={() => void invoke(increment.id, { by: 1 })}>Increment through RCIP</button>
      <button disabled={busy || !!pending} onClick={() => void invoke(increment.id, { by: -1 })}>Send invalid input</button>
    </div>
    {pending && <section className="confirmation" aria-label="Host confirmation">
      <h2>Approve one increment?</h2>
      <p>This application-owned decision expires after two minutes.</p>
      <div className="actions">
        <button disabled={busy} onClick={() => void resolve(true)}>Approve</button>
        <button disabled={busy} onClick={() => void resolve(false)}>Decline</button>
        <button disabled={busy} onClick={cancel}>Cancel request</button>
      </div>
    </section>}
    <h2>Result</h2>
    <pre aria-live="polite" data-testid="result">{result}</pre>
    <p className="note">Deterministic SDK example · no AI service connected.</p>
    <a href="https://binariedus.github.io/rcip/react-starter.html">Read the starter guide</a>
  </main>
}
