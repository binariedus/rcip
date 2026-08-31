import { useMemo, useState } from 'react'

import {
  type RcipCapabilitySnapshot,
  type RcipInvocationConfirmationRequired,
  type RcipInvocationOutcome,
  type RcipJsonValue,
  type RcipRuntime,
  useRcipSnapshot,
} from '@binaried/rcip'

interface ControlPanelProps {
  readonly runtime: RcipRuntime
}

const CAPABILITY_SAMPLES: Readonly<Record<string, RcipJsonValue>> = {
  'todos.list': {},
  'todos.search': { query: 'Submit expense report' },
  'todos.create': { title: 'Book train tickets' },
  'todos.complete': { id: 'todo-1' },
  'todos.delete': { id: 'todo-2' },
  'profile.view': {},
  'profile.update': { displayName: 'Alex Morgan' },
  'profile.export': {},
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function isJsonValue(value: unknown): value is RcipJsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return true
  }
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value !== 'object') return false
  return Object.values(value).every(isJsonValue)
}

function outcomeLabel(outcome: RcipInvocationOutcome): string {
  if (outcome.status === 'succeeded') return 'succeeded'
  if (outcome.status === 'confirmation_required') {
    return 'confirmation required'
  }
  return `${outcome.status}: ${outcome.error.code}`
}

function statusLabel(capability: RcipCapabilitySnapshot): string {
  if (!capability.bound) return 'unbound'
  return capability.available ? 'available' : 'unavailable'
}

export function ControlPanel({ runtime }: ControlPanelProps) {
  const snapshot = useRcipSnapshot()
  const capabilities = useMemo(
    () =>
      snapshot.capabilities
        .map((capability, index) => ({ capability, index }))
        .sort((left, right) => {
          if (left.capability.relevance === right.capability.relevance) {
            return left.index - right.index
          }
          return left.capability.relevance === 'current' ? -1 : 1
        })
        .map(({ capability }) => capability),
    [snapshot.capabilities],
  )
  const [selectedId, setSelectedId] = useState(
    () => capabilities[0]?.id ?? '',
  )
  const selectedCapability =
    capabilities.find((capability) => capability.id === selectedId) ??
    capabilities[0]
  const selectedSample = selectedCapability
    ? (CAPABILITY_SAMPLES[selectedCapability.id] ?? {})
    : {}
  const [input, setInput] = useState(() => formatJson(selectedSample))
  const [localError, setLocalError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RcipInvocationOutcome | null>(null)
  const [pending, setPending] =
    useState<RcipInvocationConfirmationRequired | null>(null)
  const [busy, setBusy] = useState(false)

  function selectCapability(capability: RcipCapabilitySnapshot): void {
    setSelectedId(capability.id)
    setInput(formatJson(CAPABILITY_SAMPLES[capability.id] ?? {}))
    setLocalError(null)
    setOutcome(null)
    setPending(null)
  }

  function loadSample(): void {
    setInput(formatJson(selectedSample))
    setLocalError(null)
  }

  async function invokeCapability(): Promise<void> {
    if (!selectedCapability || busy || pending) return
    setLocalError(null)
    setOutcome(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch {
      setLocalError('Enter valid JSON before invoking the capability.')
      return
    }
    if (!isJsonValue(parsed)) {
      setLocalError('Input must contain only valid JSON values.')
      return
    }

    setBusy(true)
    try {
      const nextOutcome = await runtime.client.invoke({
        capabilityId: selectedCapability.id,
        input: parsed,
      })
      setOutcome(nextOutcome)
      setPending(
        nextOutcome.status === 'confirmation_required' ? nextOutcome : null,
      )
    } finally {
      setBusy(false)
    }
  }

  async function resolveConfirmation(approved: boolean): Promise<void> {
    if (!pending || busy) return
    setBusy(true)
    try {
      const nextOutcome = await runtime.host.resolveConfirmation(
        pending.confirmation.id,
        approved,
      )
      setPending(null)
      setOutcome(nextOutcome)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-view control-panel" aria-labelledby="control-heading">
      <div className="tool-view-heading">
        <div>
          <p className="eyebrow">Direct SDK client</p>
          <h3 id="control-heading">Capability control panel</h3>
        </div>
        <span className="revision-chip">rev {snapshot.revision}</span>
      </div>
      <p className="tool-description">
        Select an advertised capability, edit its JSON input, and inspect the
        exact SDK outcome. No AI is used in this path.
      </p>

      <div className="console-grid">
        <aside className="console-catalog" aria-label="Capabilities">
          <span className="field-label">Capabilities</span>
          <div className="console-capability-list">
            {capabilities.map((capability) => (
              <button
                key={capability.id}
                type="button"
                className={
                  capability.id === selectedCapability?.id
                    ? 'console-capability-button console-capability-selected'
                    : 'console-capability-button'
                }
                aria-pressed={capability.id === selectedCapability?.id}
                data-testid={`console-capability-${capability.id}`}
                disabled={Boolean(pending) || busy}
                onClick={() => selectCapability(capability)}
              >
                <span>{capability.title}</span>
                <code>{capability.id}</code>
                <small>
                  {capability.relevance} · {statusLabel(capability)}
                </small>
              </button>
            ))}
          </div>
        </aside>

        {selectedCapability ? (
          <div className="console-executor">
            <div className="console-capability-summary">
              <div>
                <h4>{selectedCapability.title}</h4>
                <code>{selectedCapability.id}</code>
              </div>
              <div className="badge-row" aria-label="Capability metadata">
                <span className={`effect-badge effect-${selectedCapability.effect}`}>
                  {selectedCapability.effect}
                </span>
                <span className="metadata-badge">
                  {selectedCapability.relevance}
                </span>
                <span
                  className={
                    selectedCapability.bound && selectedCapability.available
                      ? 'status-ready'
                      : 'status-muted'
                  }
                >
                  {statusLabel(selectedCapability)}
                </span>
              </div>
            </div>
            <p className="capability-description">
              {selectedCapability.description}
            </p>
            <div className="scope-row">
              <span className="field-label">Scopes</span>
              {selectedCapability.scopeIds.map((scopeId) => (
                <span key={scopeId} className="metadata-badge">
                  {scopeId}
                </span>
              ))}
            </div>

            <label htmlFor="capability-input">Capability input (JSON)</label>
            <textarea
              id="capability-input"
              className="json-editor"
              value={input}
              spellCheck={false}
              disabled={Boolean(pending) || busy}
              onChange={(event) => {
                setInput(event.target.value)
                setLocalError(null)
              }}
            />
            {localError ? (
              <p className="input-error" role="alert">
                {localError}
              </p>
            ) : null}
            <div className="console-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={Boolean(pending) || busy}
                onClick={loadSample}
              >
                Load sample
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={Boolean(pending) || busy}
                onClick={() => void invokeCapability()}
              >
                {busy ? 'Running…' : 'Invoke capability'}
              </button>
            </div>

            {pending ? (
              <div
                className="confirmation-card"
                data-testid="console-confirmation"
              >
                <strong>{pending.confirmation.title}</strong>
                <p>{pending.confirmation.description}</p>
                <code>{pending.capabilityId}</code>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => void resolveConfirmation(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={busy}
                    onClick={() => void resolveConfirmation(true)}
                  >
                    Confirm capability
                  </button>
                </div>
              </div>
            ) : null}

            {outcome ? (
              <section className="console-outcome" aria-labelledby="outcome-heading">
                <div className="outcome-heading-row">
                  <h4 id="outcome-heading">Invocation outcome</h4>
                  <output data-testid="console-outcome">
                    {outcomeLabel(outcome)}
                  </output>
                </div>
                <pre data-testid="console-result">
                  {formatJson(outcome)}
                </pre>
              </section>
            ) : null}

            <details className="schema-details">
              <summary>Input and output schemas</summary>
              <h5>Input</h5>
              <pre>{formatJson(selectedCapability.inputSchema)}</pre>
              <h5>Output</h5>
              <pre>{formatJson(selectedCapability.outputSchema)}</pre>
            </details>
          </div>
        ) : (
          <p>No capabilities are advertised.</p>
        )}
      </div>
    </div>
  )
}
