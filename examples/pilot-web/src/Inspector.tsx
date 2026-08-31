import { useState } from 'react'

import {
  type RcipInvocationOutcome,
  type RcipRuntime,
  type RcipRuntimeEvent,
  useRcipSnapshot,
} from '@binaried/rcip'
import { RcipCapabilityExplorer } from '@binaried/rcip/explorer'

import {
  type ContractMatrixResult,
  runContractMatrix,
} from './contract-matrix'

interface InspectorProps {
  readonly events: readonly RcipRuntimeEvent[]
  readonly runtime: RcipRuntime
}

function resultLabel(outcome: RcipInvocationOutcome | null): string {
  if (!outcome) return 'No diagnostic invocation yet.'
  if (outcome.status === 'succeeded') return 'succeeded'
  if (outcome.status === 'confirmation_required') {
    return 'confirmation_required'
  }
  return `${outcome.status}: ${outcome.error.code}`
}

export function Inspector({ events, runtime }: InspectorProps) {
  const snapshot = useRcipSnapshot()
  const [diagnosticOutcome, setDiagnosticOutcome] =
    useState<RcipInvocationOutcome | null>(null)
  const [contractResults, setContractResults] = useState<
    readonly ContractMatrixResult[]
  >([])
  const [contractMatrixRunning, setContractMatrixRunning] = useState(false)

  async function invokeInvalidInput(): Promise<void> {
    setDiagnosticOutcome(
      await runtime.client.invoke({ capabilityId: 'todos.create', input: {} }),
    )
  }

  async function invokeUnboundCapability(): Promise<void> {
    setDiagnosticOutcome(
      await runtime.client.invoke({ capabilityId: 'profile.export', input: {} }),
    )
  }

  async function executeContractMatrix(): Promise<void> {
    setContractMatrixRunning(true)
    try {
      setContractResults(await runContractMatrix())
    } finally {
      setContractMatrixRunning(false)
    }
  }

  return (
    <section className="inspector" aria-label="RCIP registry and diagnostics">
      <RcipCapabilityExplorer client={runtime.client} />

      <div
        className="panel inspector-details"
        aria-labelledby="inspector-heading"
      >
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Reference diagnostics</p>
            <h2 id="inspector-heading">Runtime contract</h2>
          </div>
          <span className="revision-chip">rev {snapshot.revision}</span>
        </div>

        <details>
          <summary>Raw semantic snapshot</summary>
          <pre data-testid="raw-snapshot">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </details>

        <div className="diagnostics">
          <h3>Contract diagnostics</h3>
          <div className="button-row">
            <button type="button" onClick={() => void invokeInvalidInput()}>
              Reject invalid input
            </button>
            <button type="button" onClick={() => void invokeUnboundCapability()}>
              Reject unbound capability
            </button>
          </div>
          <output data-testid="diagnostic-outcome">
            {resultLabel(diagnosticOutcome)}
          </output>

          <button
            type="button"
            disabled={contractMatrixRunning}
            onClick={() => void executeContractMatrix()}
          >
            {contractMatrixRunning ? 'Running contract matrix…' : 'Run contract matrix'}
          </button>
          {contractResults.length > 0 ? (
            <ol className="contract-matrix" data-testid="contract-matrix">
              {contractResults.map((contractResult) => (
                <li
                  key={contractResult.id}
                  data-contract-check={contractResult.id}
                  data-contract-passed={String(contractResult.passed)}
                >
                  <span>{contractResult.title}</span>
                  <code>
                    {contractResult.actual}
                    {contractResult.passed
                      ? ''
                      : ` (expected ${contractResult.expected})`}
                  </code>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <details>
          <summary>Redacted invocation events ({events.length})</summary>
          <ol className="event-list" data-testid="event-list">
            {events.map((event, index) => (
              <li key={`${event.invocationId}-${event.phase}-${index}`}>
                <code>{event.capabilityId}</code> {event.phase}
                {event.errorCode ? ` (${event.errorCode})` : ''}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  )
}
