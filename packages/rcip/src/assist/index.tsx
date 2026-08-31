import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { RcipCapabilitySnapshot } from '../core/types'
import {
  useRcipAssist,
  type RcipAssistController,
  type UseRcipAssistOptions,
} from './useRcipAssist'

export type * from './types'
export { useRcipAssist }
export type { RcipAssistController, UseRcipAssistOptions }

const DEFAULT_TITLE = 'Assist'
const DEFAULT_WELCOME = 'How can I help with this application?'
const DEFAULT_PLACEHOLDER = 'Ask for help…'
const DEFAULT_DISCLOSURE = 'What can I do?'
const VIEWPORT_INSET = 12

interface RcipAssistPosition {
  readonly left: number
  readonly top: number
}

interface DragState {
  readonly height: number
  readonly offsetX: number
  readonly offsetY: number
  readonly pointerId: number
  readonly width: number
}

/** Props for the SDK's collapsed-dot and floating-chat assist tool. */
export interface RcipAssistProps extends UseRcipAssistOptions {
  readonly capabilityDisclosureLabel?: string
  readonly className?: string
  readonly defaultOpen?: boolean
  readonly examplePrompts?: readonly string[]
  readonly placeholder?: string
  readonly title?: string
}

function capabilityState(
  capability: RcipCapabilitySnapshot,
  mode: RcipAssistController['mode'],
): string {
  if (mode === 'read-only' && capability.effect !== 'read') {
    return 'Not enabled in read-only mode'
  }
  if (!capability.bound) return 'Not connected'
  if (!capability.available) {
    return capability.availability?.reason ?? 'Currently unavailable'
  }
  return 'Available'
}

function statusLabel(status: RcipAssistController['status']): string {
  const labels: Record<RcipAssistController['status'], string> = {
    active: 'Assistant active',
    attention: 'Confirmation required',
    error: 'Assistant needs attention',
    idle: 'Assistant ready',
    success: 'Action completed',
    working: 'Assistant working',
  }
  return labels[status]
}

function clampPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): RcipAssistPosition {
  return {
    left: Math.max(
      VIEWPORT_INSET,
      Math.min(window.innerWidth - width - VIEWPORT_INSET, left),
    ),
    top: Math.max(
      VIEWPORT_INSET,
      Math.min(window.innerHeight - height - VIEWPORT_INSET, top),
    ),
  }
}

/**
 * Optional batteries-included assist UI. The host supplies the runtime and a
 * consumer-owned callback; this component never selects or contacts a model.
 */
export function RcipAssist({
  capabilityDisclosureLabel = DEFAULT_DISCLOSURE,
  className,
  defaultOpen = false,
  decide,
  delayPresets,
  examplePrompts = [],
  maxBatchSize,
  mode = 'read-only',
  placeholder = DEFAULT_PLACEHOLDER,
  runtime,
  title = DEFAULT_TITLE,
  welcomeMessage = DEFAULT_WELCOME,
}: RcipAssistProps) {
  const controller = useRcipAssist({
    decide,
    delayPresets,
    maxBatchSize,
    mode,
    runtime,
    welcomeMessage,
  })
  const [open, setOpen] = useState(defaultOpen)
  const [draft, setDraft] = useState('')
  const [position, setPosition] = useState<RcipAssistPosition | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const visualStatus =
    open && controller.status === 'idle' ? 'active' : controller.status
  const rootClassName = ['rcip-assist', className].filter(Boolean).join(' ')
  const rootStyle = useMemo<CSSProperties | undefined>(
    () =>
      position
        ? {
            left: position.left,
            right: 'auto',
            top: position.top,
          }
        : undefined,
    [position],
  )

  useEffect(() => {
    if (open) composerRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!position) return
    function clampCurrentPosition() {
      const panel = panelRef.current
      if (!panel) return
      const rect = panel.getBoundingClientRect()
      setPosition((current) =>
        current
          ? clampPosition(current.left, current.top, rect.width, rect.height)
          : current,
      )
    }
    window.addEventListener('resize', clampCurrentPosition)
    return () => window.removeEventListener('resize', clampCurrentPosition)
  }, [position])

  async function submitMessage(message: string): Promise<void> {
    const normalized = message.trim()
    if (!normalized || controller.busy) return
    setDraft('')
    await controller.send(normalized)
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void submitMessage(draft)
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (
      event.button !== 0 ||
      (event.target instanceof Element &&
        Boolean(event.target.closest('button, input, textarea, summary'))) ||
      window.matchMedia('(max-width: 640px)').matches
    ) {
      return
    }
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
      width: rect.width,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPosition({ left: rect.left, top: rect.top })
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>): void {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    setPosition(
      clampPosition(
        event.clientX - current.offsetX,
        event.clientY - current.offsetY,
        current.width,
        current.height,
      ),
    )
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section
      className={rootClassName}
      data-rcip-assist=""
      data-rcip-assist-open={open ? 'true' : 'false'}
      data-rcip-assist-status={visualStatus}
      style={rootStyle}
    >
      {open ? (
        <div
          ref={panelRef}
          className="rcip-assist__panel"
          aria-label={title}
          role="dialog"
        >
          <div
            className="rcip-assist__header"
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            <div className="rcip-assist__heading">
              <span className="rcip-assist__mark" aria-hidden="true" />
              <div>
                <h2>{title}</h2>
                <p>{statusLabel(visualStatus)}</p>
              </div>
            </div>
            <div className="rcip-assist__header-actions">
              <button
                type="button"
                disabled={controller.busy}
                onClick={controller.clear}
              >
                Clear
              </button>
              <button
                type="button"
                aria-label={`Close ${title}`}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div
            className="rcip-assist__messages"
            aria-live="polite"
            data-rcip-assist-messages=""
          >
            {controller.messages.map((message) => (
              <article
                key={message.id}
                className={`rcip-assist__message rcip-assist__message--${message.role}`}
              >
                <span>{message.role === 'user' ? 'You' : title}</span>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          {controller.pendingConfirmation ? (
            <section
              className="rcip-assist__confirmation"
              aria-label="Capability confirmation"
              data-rcip-assist-confirmation=""
            >
              <p className="rcip-assist__confirmation-label">
                Confirmation required
              </p>
              <h3>
                {controller.pendingConfirmation.outcome.confirmation.title}
              </h3>
              <p>
                {
                  controller.pendingConfirmation.outcome.confirmation
                    .description
                }
              </p>
              <code>
                {controller.pendingConfirmation.action.capabilityId}
              </code>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    void controller.resolveConfirmation(false)
                  }
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rcip-assist__primary"
                  onClick={() => void controller.resolveConfirmation(true)}
                >
                  Confirm and run
                </button>
              </div>
            </section>
          ) : null}

          {examplePrompts.length > 0 && controller.messages.length <= 1 ? (
            <div className="rcip-assist__examples" aria-label="Example requests">
              {examplePrompts.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={controller.busy}
                  onClick={() => void submitMessage(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          ) : null}

          <details className="rcip-assist__capabilities">
            <summary>{capabilityDisclosureLabel}</summary>
            <div>
              {controller.snapshot.capabilities.map((capability) => (
                <article key={capability.id}>
                  <div>
                    <strong>{capability.title}</strong>
                    <span>{capability.effect}</span>
                  </div>
                  <p>{capability.description}</p>
                  <small>{capabilityState(capability, controller.mode)}</small>
                </article>
              ))}
            </div>
          </details>

          <form className="rcip-assist__composer" onSubmit={submit}>
            <label htmlFor="rcip-assist-request">Request</label>
            <textarea
              ref={composerRef}
              id="rcip-assist-request"
              rows={2}
              disabled={controller.busy}
              placeholder={placeholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div>
              {controller.busy && !controller.pendingConfirmation ? (
                <button type="button" onClick={controller.cancel}>
                  Stop
                </button>
              ) : null}
              <button
                type="submit"
                className="rcip-assist__primary"
                disabled={controller.busy || !draft.trim()}
              >
                {controller.busy ? 'Working…' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          className="rcip-assist__dot"
          aria-label={`Open ${title}. ${statusLabel(visualStatus)}.`}
          onClick={() => setOpen(true)}
        >
          <span className="rcip-assist__dot-icon" aria-hidden="true" />
        </button>
      )}
    </section>
  )
}
