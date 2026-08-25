import { useId, useMemo, useState, useSyncExternalStore } from 'react'

import type { RcipCapabilitySnapshot, RcipClient } from '../core/types'

/** Props for the SDK's read-only capability registry dashboard. */
export interface RcipCapabilityExplorerProps {
  /** Narrow RCIP client used for live, read-only registry discovery. */
  readonly client: RcipClient
  /** Optional class added to the explorer root for consumer-owned layout. */
  readonly className?: string
}

type ExplorerView = 'all' | 'current'

function capabilityStatus(capability: RcipCapabilitySnapshot): string {
  if (!capability.bound) return 'Unbound'
  return capability.available ? 'Ready' : 'Unavailable'
}

/**
 * Read-only, live view of an application's registered semantic capabilities.
 * It never invokes a capability and treats current-scope relevance as active.
 */
export function RcipCapabilityExplorer({
  client,
  className,
}: RcipCapabilityExplorerProps) {
  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  )
  const [view, setView] = useState<ExplorerView>('all')
  const headingId = useId()
  const capabilities = useMemo(
    () =>
      view === 'current'
        ? snapshot.capabilities.filter(
            (capability) => capability.relevance === 'current',
          )
        : snapshot.capabilities,
    [snapshot.capabilities, view],
  )
  const activeCount = snapshot.capabilities.filter(
    (capability) => capability.relevance === 'current',
  ).length
  const readyCount = snapshot.capabilities.filter(
    (capability) => capability.available,
  ).length
  const rootClassName = ['rcip-explorer', className].filter(Boolean).join(' ')

  return (
    <section
      className={rootClassName}
      aria-labelledby={headingId}
      data-rcip-explorer=""
    >
      <header className="rcip-explorer__header">
        <div>
          <p className="rcip-explorer__eyebrow">RCIP registry</p>
          <h2 id={headingId}>Capability explorer</h2>
          <p className="rcip-explorer__description">
            {snapshot.application.name} exposes a live, read-only semantic
            capability surface.
          </p>
        </div>
        <span className="rcip-explorer__protocol">
          Protocol {snapshot.protocolVersion}
        </span>
      </header>

      <dl className="rcip-explorer__summary">
        <div>
          <dt>Registered</dt>
          <dd>{snapshot.capabilities.length}</dd>
        </div>
        <div>
          <dt>Active now</dt>
          <dd>{activeCount}</dd>
        </div>
        <div>
          <dt>Ready</dt>
          <dd>{readyCount}</dd>
        </div>
        <div>
          <dt>Current scope</dt>
          <dd data-rcip-current-scope="">
            {snapshot.context.primaryScopeId ?? 'None'}
          </dd>
        </div>
      </dl>

      <div className="rcip-explorer__toolbar">
        <div className="rcip-explorer__filters" aria-label="Registry view">
          <button
            type="button"
            aria-pressed={view === 'all'}
            onClick={() => setView('all')}
          >
            All capabilities
          </button>
          <button
            type="button"
            aria-pressed={view === 'current'}
            onClick={() => setView('current')}
          >
            Active now
          </button>
        </div>
        <span className="rcip-explorer__revision">rev {snapshot.revision}</span>
      </div>

      {capabilities.length > 0 ? (
        <div className="rcip-explorer__list" role="list">
          {capabilities.map((capability) => {
            const isCurrent = capability.relevance === 'current'
            return (
              <article
                key={capability.id}
                className={
                  isCurrent
                    ? 'rcip-explorer__card rcip-explorer__card--active'
                    : 'rcip-explorer__card'
                }
                role="listitem"
                data-rcip-capability-id={capability.id}
                data-rcip-relevance={capability.relevance}
              >
                <div className="rcip-explorer__card-heading">
                  <div>
                    <h3>{capability.title}</h3>
                    <code>{capability.id}</code>
                  </div>
                  <div className="rcip-explorer__badges">
                    {isCurrent ? (
                      <span className="rcip-explorer__badge rcip-explorer__badge--active">
                        Active
                      </span>
                    ) : null}
                    <span className="rcip-explorer__badge">
                      {capability.effect}
                    </span>
                    <span
                      className={
                        capability.available
                          ? 'rcip-explorer__badge rcip-explorer__badge--ready'
                          : 'rcip-explorer__badge rcip-explorer__badge--muted'
                      }
                    >
                      {capabilityStatus(capability)}
                    </span>
                  </div>
                </div>

                <p>{capability.description}</p>
                <div className="rcip-explorer__scopes" aria-label="Scopes">
                  {capability.scopeIds.length > 0 ? (
                    capability.scopeIds.map((scopeId) => (
                      <span key={scopeId}>{scopeId}</span>
                    ))
                  ) : (
                    <span>application</span>
                  )}
                </div>

                {!capability.available && capability.availability?.reason ? (
                  <p className="rcip-explorer__availability">
                    {capability.availability.reason}
                  </p>
                ) : null}

                <details className="rcip-explorer__schemas">
                  <summary>Contract schemas</summary>
                  <div>
                    <section aria-label="Input schema">
                      <h4>Input</h4>
                      <pre>{JSON.stringify(capability.inputSchema, null, 2)}</pre>
                    </section>
                    <section aria-label="Output schema">
                      <h4>Output</h4>
                      <pre>{JSON.stringify(capability.outputSchema, null, 2)}</pre>
                    </section>
                  </div>
                </details>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="rcip-explorer__empty">
          No capabilities are active in the current semantic context.
        </p>
      )}
    </section>
  )
}
