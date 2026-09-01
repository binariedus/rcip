import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

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
const DEFAULT_PLACEHOLDER = 'Message Assist…'
const VIEWPORT_INSET = 12
const CLICK_DECISION_MS = 280
const TOUCH_LONG_PRESS_MS = 560
const VOICE_UNAVAILABLE_NOTICE_MS = 2_500
const VOICE_UNAVAILABLE_MESSAGE = 'Voice input isn’t available right now'

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

type RcipAssistVisualStatus =
  | RcipAssistController['status']
  | 'listening'
  | 'processing'

interface IconProps {
  readonly className?: string
}

/** Props for the SDK's collapsed-dot and floating-chat assist tool. */
export interface RcipAssistProps extends UseRcipAssistOptions {
  readonly className?: string
  readonly defaultOpen?: boolean
  readonly placeholder?: string
  readonly title?: string
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  )
}

function MicrophoneIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  )
}

function NewChatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8" />
      <path d="M16 3v6M13 6h6M8 10h5M8 14h8" />
    </svg>
  )
}

function SendIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 4 17 8-17 8 3-8-3-8Z" />
      <path d="M7 12h14" />
    </svg>
  )
}

function StopIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  )
}

function statusLabel(
  visualStatus: RcipAssistVisualStatus,
  inputError: RcipAssistController['inputError'],
): string {
  if (visualStatus === 'listening') return 'Listening — click again to finish'
  if (visualStatus === 'processing') return 'Processing voice input'
  if (visualStatus === 'error' && inputError) return inputError.message
  const labels: Record<RcipAssistController['status'], string> = {
    active: 'Ready to help',
    attention: 'Your confirmation is needed',
    error: 'Something needs your attention',
    idle: 'Ready',
    success: 'Done',
    working: 'Working on your request',
  }
  return labels[visualStatus]
}

function visualStatusFor(
  controller: RcipAssistController,
  open: boolean,
): RcipAssistVisualStatus {
  if (controller.inputStatus === 'listening') return 'listening'
  if (
    controller.inputStatus === 'processing' ||
    controller.inputStatus === 'starting'
  ) {
    return 'processing'
  }
  if (controller.inputStatus === 'error') return 'error'
  if (open && controller.status === 'idle') return 'active'
  return controller.status
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
  className,
  defaultOpen = false,
  decide,
  delayPresets,
  inputPipeline,
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
    inputPipeline,
    maxBatchSize,
    mode,
    runtime,
    welcomeMessage,
  })
  const [open, setOpen] = useState(defaultOpen)
  const [draft, setDraft] = useState('')
  const [position, setPosition] = useState<RcipAssistPosition | null>(null)
  const [voiceUnavailableNotice, setVoiceUnavailableNotice] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLButtonElement | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const clickTimerRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const voiceUnavailableTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const previouslyOpenRef = useRef(open)
  const visualStatus = visualStatusFor(controller, open)
  const currentStatusLabel = statusLabel(visualStatus, controller.inputError)
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

  const clearInteractionTimers = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (voiceUnavailableTimerRef.current !== null) {
      window.clearTimeout(voiceUnavailableTimerRef.current)
      voiceUnavailableTimerRef.current = null
    }
  }, [])

  const showVoiceUnavailable = useCallback(() => {
    if (voiceUnavailableTimerRef.current !== null) {
      window.clearTimeout(voiceUnavailableTimerRef.current)
    }
    setVoiceUnavailableNotice(true)
    voiceUnavailableTimerRef.current = window.setTimeout(() => {
      voiceUnavailableTimerRef.current = null
      setVoiceUnavailableNotice(false)
    }, VOICE_UNAVAILABLE_NOTICE_MS)
  }, [])

  const openPanel = useCallback(() => {
    clearInteractionTimers()
    setVoiceUnavailableNotice(false)
    controller.cancelInput()
    setOpen(true)
  }, [clearInteractionTimers, controller])

  const closePanel = useCallback(() => {
    clearInteractionTimers()
    controller.cancelInput()
    dragRef.current = null
    setPosition(null)
    setOpen(false)
  }, [clearInteractionTimers, controller])

  const toggleVoiceInput = useCallback(() => {
    if (!controller.voiceEnabled) {
      showVoiceUnavailable()
      return
    }
    if (controller.inputStatus === 'listening') {
      void controller.stopVoiceInput()
      return
    }
    if (
      controller.inputStatus === 'idle' ||
      controller.inputStatus === 'error'
    ) {
      void controller.startVoiceInput()
    }
  }, [controller, showVoiceUnavailable])

  useEffect(() => {
    if (open) composerRef.current?.focus()
    if (previouslyOpenRef.current && !open) dotRef.current?.focus()
    previouslyOpenRef.current = open
  }, [open])

  useEffect(() => {
    const messages = messagesRef.current
    if (open && messages) messages.scrollTop = messages.scrollHeight
  }, [controller.messages, controller.pendingConfirmation, controller.status, open])

  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [closePanel, open])

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

  useEffect(
    () => () => {
      clearInteractionTimers()
    },
    [clearInteractionTimers],
  )

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

  function composerKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void submitMessage(draft)
    }
  }

  function dotClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (event.detail > 1 || clickTimerRef.current !== null) return
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null
      toggleVoiceInput()
    }, CLICK_DECISION_MS)
  }

  function dotDoubleClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    openPanel()
  }

  function dotKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.repeat) return
    if (event.key === 'Enter') {
      event.preventDefault()
      openPanel()
    } else if (event.key === ' ') {
      event.preventDefault()
      toggleVoiceInput()
    }
  }

  function dotPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (event.pointerType !== 'touch') return
    clearInteractionTimers()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null
      suppressClickRef.current = true
      openPanel()
    }, TOUCH_LONG_PRESS_MS)
  }

  function stopLongPress(): void {
    if (longPressTimerRef.current === null) return
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (
      event.button !== 0 ||
      (event.target instanceof Element &&
        Boolean(event.target.closest('button, input, textarea'))) ||
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

  const voiceButtonLabel =
    controller.inputStatus === 'listening'
      ? 'Stop voice input'
      : 'Start voice input'
  const launcherHint = controller.voiceEnabled
    ? 'Click to listen · Double-click to open'
    : voiceUnavailableNotice
      ? VOICE_UNAVAILABLE_MESSAGE
      : 'Voice input unavailable · Double-click to open'
  const launcherLabel = controller.voiceEnabled
    ? `${title}. ${currentStatusLabel}. Press Space to start or stop voice input. Press Enter to open chat.`
    : `${title}. ${currentStatusLabel}. Voice input unavailable. Press Enter to open chat.`
  const turnIsWorking =
    controller.status === 'working' && !controller.pendingConfirmation

  return (
    <section
      className={rootClassName}
      data-rcip-assist=""
      data-rcip-assist-input-status={controller.inputStatus}
      data-rcip-assist-open={open ? 'true' : 'false'}
      data-rcip-assist-status={visualStatus}
      style={rootStyle}
    >
      {open ? (
        <div
          ref={panelRef}
          className="rcip-assist__panel"
          aria-label={title}
          aria-modal="false"
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
              <span className="rcip-assist__brand" aria-hidden="true">
                <span />
              </span>
              <div>
                <h2>{title}</h2>
                <p aria-live="polite">{currentStatusLabel}</p>
              </div>
            </div>
            <div className="rcip-assist__header-actions">
              <button
                type="button"
                className="rcip-assist__icon-button"
                aria-label="Start a new conversation"
                disabled={controller.busy}
                onClick={controller.clear}
              >
                <NewChatIcon />
              </button>
              <button
                type="button"
                className="rcip-assist__icon-button"
                aria-label={`Close ${title}`}
                onClick={closePanel}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div
            ref={messagesRef}
            className="rcip-assist__messages"
            aria-live="polite"
            data-rcip-assist-messages=""
          >
            {controller.messages.map((message) => (
              <article
                key={message.id}
                className={`rcip-assist__message rcip-assist__message--${message.role}`}
              >
                {message.role === 'assistant' ? (
                  <span className="rcip-assist__message-mark" aria-hidden="true" />
                ) : null}
                <p>{message.content}</p>
              </article>
            ))}

            {turnIsWorking ? (
              <div className="rcip-assist__thinking" aria-label="Assist is working">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>

          {controller.pendingConfirmation ? (
            <section
              className="rcip-assist__confirmation"
              aria-label="Capability confirmation"
              data-rcip-assist-confirmation=""
            >
              <div className="rcip-assist__confirmation-icon" aria-hidden="true">
                !
              </div>
              <div className="rcip-assist__confirmation-content">
                <p className="rcip-assist__confirmation-label">Review action</p>
                <h3>
                  {controller.pendingConfirmation.outcome.confirmation.title}
                </h3>
                <p>
                  {
                    controller.pendingConfirmation.outcome.confirmation
                      .description
                  }
                </p>
                <div className="rcip-assist__confirmation-actions">
                  <button
                    type="button"
                    onClick={() => void controller.resolveConfirmation(false)}
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
              </div>
            </section>
          ) : null}

          {controller.inputError ? (
            <p className="rcip-assist__input-error" role="alert">
              {controller.inputError.message}
            </p>
          ) : null}

          <form className="rcip-assist__composer" onSubmit={submit}>
            <label className="rcip-assist__sr-only" htmlFor="rcip-assist-request">
              Request
            </label>
            <div className="rcip-assist__composer-shell">
              <textarea
                ref={composerRef}
                id="rcip-assist-request"
                rows={1}
                disabled={controller.busy}
                placeholder={placeholder}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={composerKeyDown}
              />
              <div className="rcip-assist__composer-actions">
                {controller.voiceEnabled ? (
                  <button
                    type="button"
                    className="rcip-assist__composer-button rcip-assist__voice-button"
                    data-active={
                      controller.inputStatus === 'listening' ? 'true' : 'false'
                    }
                    aria-label={voiceButtonLabel}
                    disabled={
                      controller.status === 'working' ||
                      controller.inputStatus === 'processing' ||
                      controller.inputStatus === 'starting'
                    }
                    onClick={toggleVoiceInput}
                  >
                    <MicrophoneIcon />
                  </button>
                ) : null}
                {turnIsWorking ? (
                  <button
                    type="button"
                    className="rcip-assist__composer-button rcip-assist__send-button"
                    aria-label="Stop current request"
                    onClick={controller.cancel}
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="rcip-assist__composer-button rcip-assist__send-button"
                    aria-label="Send request"
                    disabled={controller.busy || !draft.trim()}
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
            <p className="rcip-assist__composer-hint">
              Enter to send · Shift + Enter for a new line
            </p>
          </form>
        </div>
      ) : (
        <div className="rcip-assist__launcher">
          <span
            className="rcip-assist__launcher-hint"
            data-visible={voiceUnavailableNotice ? 'true' : 'false'}
            role="tooltip"
            aria-live="polite"
          >
            {launcherHint}
          </span>
          <button
            ref={dotRef}
            type="button"
            className="rcip-assist__dot"
            aria-label={launcherLabel}
            aria-pressed={
              controller.voiceEnabled
                ? controller.inputStatus === 'listening'
                : undefined
            }
            onClick={dotClick}
            onDoubleClick={dotDoubleClick}
            onKeyDown={dotKeyDown}
            onPointerDown={dotPointerDown}
            onPointerUp={stopLongPress}
            onPointerCancel={stopLongPress}
            onPointerLeave={stopLongPress}
          >
            <span className="rcip-assist__dot-halo" aria-hidden="true" />
            <span className="rcip-assist__dot-core" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      )}
    </section>
  )
}
