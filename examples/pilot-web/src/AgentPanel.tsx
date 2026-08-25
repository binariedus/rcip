import { type FormEvent, useRef, useState } from 'react'

import {
  type RcipInvocationConfirmationRequired,
  type RcipInvocationOutcome,
  type RcipRuntime,
} from '@binaried/rcip'

import type {
  PilotAgentCall,
  PilotAgentDecision,
  PilotAgentRequest,
  PilotAgentStep,
} from './agent-contract'

interface AgentMessage {
  readonly id: number
  readonly role: 'assistant' | 'user'
  readonly text: string
}

interface PendingAgentConfirmation {
  readonly call: PilotAgentCall
  readonly message: string
  readonly outcome: RcipInvocationConfirmationRequired
  readonly steps: readonly PilotAgentStep[]
}

interface AgentPanelProps {
  readonly runtime: RcipRuntime
}

const EXAMPLE_REQUESTS = [
  'Add "Book flight tickets" to my todos',
  'Mark "Submit expense report" as completed',
  'Change my display name to Alex Morgan',
  'Delete "Review security policy"',
]

async function requestDecision(
  request: PilotAgentRequest,
): Promise<PilotAgentDecision> {
  const response = await fetch('/api/agent/decide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error('The pilot agent endpoint is unavailable.')
  }
  return response.json()
}

function outcomeText(outcome: RcipInvocationOutcome): string {
  if (outcome.status === 'succeeded') return 'Capability completed.'
  if (outcome.status === 'confirmation_required') {
    return 'This capability needs your confirmation.'
  }
  return `${outcome.error.code}: ${outcome.error.message}`
}

export function AgentPanel({ runtime }: AgentPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<readonly AgentMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Ask me to work with the todo or profile capabilities.',
    },
  ])
  const [adapter, setAdapter] = useState<'deterministic' | 'openai' | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingAgentConfirmation | null>(null)
  const nextMessageId = useRef(2)

  function appendMessage(role: AgentMessage['role'], text: string): void {
    const id = nextMessageId.current
    nextMessageId.current += 1
    setMessages((current) => [
      ...current,
      { id, role, text },
    ])
  }

  async function continueTurn(
    message: string,
    initialSteps: readonly PilotAgentStep[],
  ): Promise<void> {
    let steps = [...initialSteps]

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const decision = await requestDecision({
        message,
        snapshot: runtime.client.getSnapshot(),
        steps,
      })
      setAdapter(decision.adapter)
      if (decision.type === 'message') {
        appendMessage('assistant', decision.message)
        return
      }

      const call = decision.calls[0]
      if (!call) {
        appendMessage('assistant', 'No safe capability call was proposed.')
        return
      }

      const outcome = await runtime.client.invoke({
        capabilityId: call.capabilityId,
        input: call.input,
      })
      if (outcome.status === 'confirmation_required') {
        setPending({ call, message, outcome, steps })
        appendMessage('assistant', outcomeText(outcome))
        return
      }
      steps = [...steps, { call, outcome }]
    }

    appendMessage(
      'assistant',
      'I stopped after reaching the pilot’s capability-call limit.',
    )
  }

  async function submitMessage(message: string): Promise<void> {
    const normalized = message.trim()
    if (!normalized || busy || pending) return
    setBusy(true)
    appendMessage('user', normalized)
    setInput('')
    try {
      await continueTurn(normalized, [])
    } catch {
      appendMessage(
        'assistant',
        'The agent adapter could not process that request. The normal app remains available.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await submitMessage(input)
  }

  async function resolvePending(approved: boolean): Promise<void> {
    if (!pending) return
    setBusy(true)
    setPending(null)
    try {
      const outcome = await runtime.host.resolveConfirmation(
        pending.outcome.confirmation.id,
        approved,
      )
      await continueTurn(pending.message, [
        ...pending.steps,
        { call: pending.call, outcome },
      ])
    } catch {
      appendMessage('assistant', 'The confirmation could not be resolved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-view agent-panel" aria-labelledby="agent-heading">
      <div className="panel-heading-row">
        <div>
          <p className="eyebrow">AI delegate</p>
          <h2 id="agent-heading">Semantic assistant</h2>
        </div>
        <span className="adapter-chip" data-testid="agent-adapter">
          {adapter ?? 'auto'}
        </span>
      </div>

      <div className="messages" aria-live="polite" data-testid="agent-messages">
        {messages.map((message) => (
          <p key={message.id} className={`message message-${message.role}`}>
            <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
            {message.text}
          </p>
        ))}
      </div>

      {pending ? (
        <div className="confirmation-card" data-testid="confirmation-card">
          <strong>{pending.outcome.confirmation.title}</strong>
          <p>{pending.outcome.confirmation.description}</p>
          <code>{pending.call.capabilityId}</code>
          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void resolvePending(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={() => void resolvePending(true)}
            >
              Confirm and run
            </button>
          </div>
        </div>
      ) : null}

      <form className="agent-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="agent-request">Request</label>
        <textarea
          id="agent-request"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Add a todo or update my profile…"
          disabled={busy || Boolean(pending)}
        />
        <button
          className="button button-primary"
          type="submit"
          disabled={busy || Boolean(pending) || !input.trim()}
        >
          {busy ? 'Working…' : 'Send request'}
        </button>
      </form>

      <div className="examples" aria-label="Example requests">
        {EXAMPLE_REQUESTS.map((request) => (
          <button
            key={request}
            type="button"
            disabled={busy || Boolean(pending)}
            onClick={() => void submitMessage(request)}
          >
            {request}
          </button>
        ))}
      </div>
    </div>
  )
}
