import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type {
  RcipApplicationSnapshot,
  RcipInvocationOutcome,
  RcipRuntime,
} from '../core/types'
import type {
  RcipAssistAction,
  RcipAssistDecide,
  RcipAssistDelay,
  RcipAssistDelayPresets,
  RcipAssistInput,
  RcipAssistInputFailure,
  RcipAssistInputOrigin,
  RcipAssistInputPipeline,
  RcipAssistInputStatus,
  RcipAssistMessage,
  RcipAssistMode,
  RcipAssistPendingConfirmation,
  RcipAssistRequest,
  RcipAssistResponse,
  RcipAssistStatus,
  RcipAssistStep,
  RcipAssistVoiceAdapter,
} from './types'

const DEFAULT_DELAYS: RcipAssistDelayPresets = {
  long: 1_500,
  medium: 750,
  short: 250,
}
const DEFAULT_MAX_BATCH_SIZE = 8
const MAX_BATCH_SIZE = 32
const MAX_DELAY_MS = 10_000
const SUCCESS_STATUS_MS = 1_500
const SIMULATED_VOICE_PROCESSING_MS = 1_000
let assistIdSequence = 0

interface ConfirmationWaiter {
  readonly reject: (error: Error) => void
  readonly resolve: (outcome: RcipInvocationOutcome) => void
}

/** Configuration for the provider-neutral assist orchestration hook. */
export interface UseRcipAssistOptions {
  readonly decide: RcipAssistDecide
  readonly delayPresets?: Partial<RcipAssistDelayPresets>
  readonly inputPipeline?: RcipAssistInputPipeline
  readonly maxBatchSize?: number
  readonly mode?: RcipAssistMode
  readonly runtime: RcipRuntime
  readonly welcomeMessage?: string
}

/** State and actions returned by the provider-neutral assist orchestration hook. */
export interface RcipAssistController {
  readonly busy: boolean
  readonly cancel: () => void
  readonly cancelInput: () => void
  readonly clear: () => void
  readonly inputError: RcipAssistInputFailure | null
  readonly inputStatus: RcipAssistInputStatus
  readonly messages: readonly RcipAssistMessage[]
  readonly mode: RcipAssistMode
  readonly pendingConfirmation: RcipAssistPendingConfirmation | null
  readonly resolveConfirmation: (approved: boolean) => Promise<void>
  readonly send: (message: string) => Promise<void>
  readonly snapshot: RcipApplicationSnapshot
  readonly startVoiceInput: () => Promise<void>
  readonly status: RcipAssistStatus
  readonly stopVoiceInput: () => Promise<void>
  readonly submitInput: (
    input: RcipAssistInput,
    origin?: RcipAssistInputOrigin,
  ) => Promise<void>
  readonly voiceEnabled: boolean
}

function createAssistId(prefix: string): string {
  assistIdSequence += 1
  return `${prefix}_${Date.now().toString(36)}_${assistIdSequence.toString(36)}`
}

function createMessage(
  role: RcipAssistMessage['role'],
  content: string,
): RcipAssistMessage {
  return {
    content,
    createdAt: Date.now(),
    id: createAssistId('message'),
    role,
  }
}

function initialMessages(welcomeMessage: string | undefined) {
  const normalized = welcomeMessage?.trim()
  return normalized ? [createMessage('assistant', normalized)] : []
}

function filteredSnapshot(
  snapshot: RcipApplicationSnapshot,
  mode: RcipAssistMode,
): RcipApplicationSnapshot {
  if (mode === 'interactive') return snapshot
  return {
    ...snapshot,
    capabilities: snapshot.capabilities.filter(
      (capability) => capability.effect === 'read',
    ),
  }
}

function boundedDelay(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(MAX_DELAY_MS, value))
}

function normalizedDelays(
  overrides: Partial<RcipAssistDelayPresets> | undefined,
): RcipAssistDelayPresets {
  return {
    long: boundedDelay(overrides?.long, DEFAULT_DELAYS.long),
    medium: boundedDelay(overrides?.medium, DEFAULT_DELAYS.medium),
    short: boundedDelay(overrides?.short, DEFAULT_DELAYS.short),
  }
}

function normalizedBatchSize(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_BATCH_SIZE
  }
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(value)))
}

function abortError(): Error {
  const error = new Error('The assist turn was cancelled.')
  error.name = 'AbortError'
  return error
}

function abortableDelay(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(abortError())
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)
    function abort() {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(abortError())
    }
    signal.addEventListener('abort', abort, { once: true })
  })
}

const simulatedVoiceAdapter: RcipAssistVoiceAdapter = {
  start() {},
  async stop({ signal }) {
    await abortableDelay(SIMULATED_VOICE_PROCESSING_MS, signal)
    return null
  },
}

class AssistInputError extends Error {
  readonly failure: RcipAssistInputFailure

  constructor(failure: RcipAssistInputFailure) {
    super(failure.message)
    this.name = 'AssistInputError'
    this.failure = failure
  }
}

function inputFailure(
  code: RcipAssistInputFailure['code'],
  message: string,
): AssistInputError {
  return new AssistInputError({ code, message })
}

function configuredVoiceAdapter(
  pipeline: RcipAssistInputPipeline | undefined,
): RcipAssistVoiceAdapter | null {
  if (pipeline?.voice === false) return null
  return pipeline?.voice ?? simulatedVoiceAdapter
}

function validMessageResponse(
  response: RcipAssistResponse,
): response is Extract<RcipAssistResponse, { type: 'message' }> {
  return response.type === 'message' && Boolean(response.message.trim())
}

function normalizeActions(
  response: RcipAssistResponse,
  maxBatchSize: number,
): readonly (RcipAssistAction & { readonly id: string })[] {
  if (
    response.type !== 'actions' ||
    response.actions.length === 0 ||
    response.actions.length > maxBatchSize
  ) {
    throw new Error('The assist callback returned an invalid action batch.')
  }
  return response.actions.map((action) => {
    if (
      !action.capabilityId.trim() ||
      !['long', 'medium', 'short'].includes(action.delayAfter)
    ) {
      throw new Error('The assist callback returned an invalid action.')
    }
    return {
      ...action,
      id: action.id?.trim() || createAssistId('action'),
    }
  })
}

function readOnlyDeniedOutcome(
  action: RcipAssistAction & { readonly id: string },
): RcipInvocationOutcome {
  return {
    capabilityId: action.capabilityId,
    error: {
      code: 'POLICY_DENIED',
      message: 'Assist read-only mode denied a state-changing capability.',
    },
    invocationId: action.id,
    status: 'denied',
  }
}

function fallbackSummary(steps: readonly RcipAssistStep[]): string {
  if (steps.length === 0) return 'No capability was run.'
  const last = steps.at(-1)
  if (!last) return 'No capability was run.'
  if (last.outcome.status === 'succeeded') {
    return steps.length === 1
      ? 'The requested action completed successfully.'
      : `${String(steps.length)} actions completed successfully.`
  }
  if (last.outcome.status === 'confirmation_required') {
    return 'The application is still waiting for confirmation.'
  }
  return `The action stopped: ${last.outcome.error.message}`
}

function requestFor(
  phase: RcipAssistRequest['phase'],
  turnId: string,
  messages: readonly RcipAssistMessage[],
  mode: RcipAssistMode,
  snapshot: RcipApplicationSnapshot,
  steps: readonly RcipAssistStep[],
): RcipAssistRequest {
  return {
    messages,
    mode,
    phase,
    snapshot: filteredSnapshot(snapshot, mode),
    steps,
    turnId,
  }
}

/**
 * Runs one bounded assist turn: one decision, at most one action batch, and one
 * summarize-only callback. It performs no network request on its own.
 */
export function useRcipAssist({
  decide,
  delayPresets,
  inputPipeline,
  maxBatchSize,
  mode = 'read-only',
  runtime,
  welcomeMessage,
}: UseRcipAssistOptions): RcipAssistController {
  const [messages, setMessages] = useState<readonly RcipAssistMessage[]>(() =>
    initialMessages(welcomeMessage),
  )
  const [pendingConfirmation, setPendingConfirmation] =
    useState<RcipAssistPendingConfirmation | null>(null)
  const [status, setStatus] = useState<RcipAssistStatus>('idle')
  const [inputStatus, setInputStatus] =
    useState<RcipAssistInputStatus>('idle')
  const [inputError, setInputError] =
    useState<RcipAssistInputFailure | null>(null)
  const snapshot = useSyncExternalStore(
    runtime.client.subscribe,
    runtime.client.getSnapshot,
    runtime.client.getSnapshot,
  )
  const messagesRef = useRef(messages)
  const confirmationWaiterRef = useRef<ConfirmationWaiter | null>(null)
  const inputAbortRef = useRef<AbortController | null>(null)
  const voiceAdapterRef = useRef<RcipAssistVoiceAdapter | null>(null)
  const turnAbortRef = useRef<AbortController | null>(null)
  const successTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const currentOptionsRef = useRef({
    decide,
    delayPresets,
    inputPipeline,
    maxBatchSize,
    mode,
    runtime,
    welcomeMessage,
  })
  currentOptionsRef.current = {
    decide,
    delayPresets,
    inputPipeline,
    maxBatchSize,
    mode,
    runtime,
    welcomeMessage,
  }

  const replaceMessages = useCallback(
    (nextMessages: readonly RcipAssistMessage[]) => {
      messagesRef.current = nextMessages
      if (mountedRef.current) setMessages(nextMessages)
    },
    [],
  )

  const appendMessage = useCallback(
    (role: RcipAssistMessage['role'], content: string) => {
      replaceMessages([...messagesRef.current, createMessage(role, content)])
    },
    [replaceMessages],
  )

  const showStatus = useCallback((nextStatus: RcipAssistStatus) => {
    if (!mountedRef.current) return
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
    setStatus(nextStatus)
    if (nextStatus === 'success') {
      successTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setStatus('active')
      }, SUCCESS_STATUS_MS)
    }
  }, [])

  const waitForConfirmation = useCallback(
    (
      action: RcipAssistAction & { readonly id: string },
      outcome: Extract<
        RcipInvocationOutcome,
        { status: 'confirmation_required' }
      >,
    ) =>
      new Promise<RcipInvocationOutcome>((resolve, reject) => {
        confirmationWaiterRef.current = { reject, resolve }
        setPendingConfirmation({ action, outcome })
        showStatus('attention')
      }),
    [showStatus],
  )

  const runTurn = useCallback(
    async (rawMessage: string): Promise<void> => {
      const normalizedMessage = rawMessage.trim()
      if (!normalizedMessage || turnAbortRef.current) return

      const options = currentOptionsRef.current
      const abortController = new AbortController()
      const turnId = createAssistId('turn')
      const userMessage = createMessage('user', normalizedMessage)
      const turnMessages = [...messagesRef.current, userMessage]
      replaceMessages(turnMessages)
      turnAbortRef.current = abortController
      showStatus('working')

      try {
        const decision = await options.decide(
          requestFor(
            'decide',
            turnId,
            turnMessages,
            options.mode,
            options.runtime.client.getSnapshot(),
            [],
          ),
          { signal: abortController.signal },
        )
        if (validMessageResponse(decision)) {
          appendMessage('assistant', decision.message.trim())
          showStatus('active')
          return
        }

        const actions = normalizeActions(
          decision,
          normalizedBatchSize(options.maxBatchSize),
        )
        const delays = normalizedDelays(options.delayPresets)
        const steps: RcipAssistStep[] = []

        for (const [index, action] of actions.entries()) {
          if (abortController.signal.aborted) throw abortError()
          const currentSnapshot = options.runtime.client.getSnapshot()
          const capability = currentSnapshot.capabilities.find(
            (candidate) => candidate.id === action.capabilityId,
          )
          let outcome: RcipInvocationOutcome
          if (
            options.mode === 'read-only' &&
            capability?.effect !== 'read'
          ) {
            outcome = readOnlyDeniedOutcome(action)
          } else {
            outcome = await options.runtime.client.invoke({
              capabilityId: action.capabilityId,
              input: action.input,
              invocationId: action.id,
              signal: abortController.signal,
            })
          }
          if (outcome.status === 'confirmation_required') {
            outcome = await waitForConfirmation(action, outcome)
            showStatus('working')
          }
          steps.push({ action, outcome })
          if (outcome.status !== 'succeeded') break
          if (index < actions.length - 1) {
            await abortableDelay(
              delays[action.delayAfter as RcipAssistDelay],
              abortController.signal,
            )
          }
        }

        let summary = fallbackSummary(steps)
        try {
          const summaryResponse = await options.decide(
            requestFor(
              'summarize',
              turnId,
              turnMessages,
              options.mode,
              options.runtime.client.getSnapshot(),
              steps,
            ),
            { signal: abortController.signal },
          )
          if (!validMessageResponse(summaryResponse)) {
            throw new Error(
              'The summarize callback must return a message response.',
            )
          }
          summary = summaryResponse.message.trim()
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') throw error
        }
        appendMessage('assistant', summary)
        showStatus(
          steps.length > 0 &&
            steps.every((step) => step.outcome.status === 'succeeded')
            ? 'success'
            : 'error',
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          appendMessage('assistant', 'The request was cancelled.')
          showStatus('active')
        } else {
          appendMessage(
            'assistant',
            'The configured assistant could not process that request. The application remains available.',
          )
          showStatus('error')
        }
      } finally {
        turnAbortRef.current = null
      }
    },
    [appendMessage, replaceMessages, showStatus, waitForConfirmation],
  )

  const finishInput = useCallback(
    (
      abortController: AbortController,
      failure: RcipAssistInputFailure | null = null,
    ) => {
      if (inputAbortRef.current !== abortController) return
      inputAbortRef.current = null
      voiceAdapterRef.current = null
      if (!mountedRef.current) return
      setInputError(failure)
      setInputStatus(failure ? 'error' : 'idle')
    },
    [],
  )

  const processInput = useCallback(
    async (
      initialInput: RcipAssistInput,
      origin: RcipAssistInputOrigin,
      abortController: AbortController,
    ): Promise<void> => {
      try {
        let currentInput: RcipAssistInput | null = initialInput
        const options = currentOptionsRef.current
        for (const processor of options.inputPipeline?.processors ?? []) {
          if (abortController.signal.aborted) throw abortError()
          if (!processor.id.trim()) {
            throw inputFailure(
              'INPUT_PROCESSOR_FAILED',
              'An Assist input processor is missing its identifier.',
            )
          }
          try {
            currentInput = await processor.process(currentInput, {
              origin,
              signal: abortController.signal,
              snapshot: options.runtime.client.getSnapshot(),
            })
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              throw error
            }
            throw inputFailure(
              'INPUT_PROCESSOR_FAILED',
              `The input processor "${processor.id}" could not complete.`,
            )
          }
          if (currentInput === null) break
        }

        if (abortController.signal.aborted) throw abortError()
        if (currentInput === null) {
          finishInput(abortController)
          return
        }
        if (currentInput.type !== 'text') {
          throw inputFailure(
            'INPUT_PIPELINE_INCOMPLETE',
            'The input pipeline must produce text before Assist can continue.',
          )
        }
        const normalizedText = currentInput.text.trim()
        finishInput(abortController)
        if (normalizedText) await runTurn(normalizedText)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          finishInput(abortController)
          return
        }
        finishInput(
          abortController,
          error instanceof AssistInputError
            ? error.failure
            : {
                code: 'INPUT_PROCESSOR_FAILED',
                message: 'The Assist input pipeline could not complete.',
              },
        )
      }
    },
    [finishInput, runTurn],
  )

  const submitInput = useCallback(
    async (
      input: RcipAssistInput,
      origin: RcipAssistInputOrigin = 'composer',
    ): Promise<void> => {
      if (turnAbortRef.current || inputAbortRef.current) return
      const abortController = new AbortController()
      inputAbortRef.current = abortController
      setInputError(null)
      setInputStatus('processing')
      await processInput(input, origin, abortController)
    },
    [processInput],
  )

  const send = useCallback(
    async (message: string): Promise<void> => {
      await submitInput({ text: message, type: 'text' }, 'composer')
    },
    [submitInput],
  )

  const startVoiceInput = useCallback(async (): Promise<void> => {
    if (turnAbortRef.current || inputAbortRef.current) return
    const adapter = configuredVoiceAdapter(
      currentOptionsRef.current.inputPipeline,
    )
    if (!adapter) return

    const abortController = new AbortController()
    inputAbortRef.current = abortController
    voiceAdapterRef.current = adapter
    setInputError(null)
    setInputStatus('starting')
    try {
      await adapter.start({ signal: abortController.signal })
      if (abortController.signal.aborted) throw abortError()
      if (inputAbortRef.current === abortController && mountedRef.current) {
        setInputStatus('listening')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        finishInput(abortController)
        return
      }
      finishInput(abortController, {
        code: 'VOICE_START_FAILED',
        message: 'Voice input could not start.',
      })
    }
  }, [finishInput])

  const stopVoiceInput = useCallback(async (): Promise<void> => {
    const abortController = inputAbortRef.current
    const adapter = voiceAdapterRef.current
    if (!abortController || !adapter || inputStatus !== 'listening') return
    setInputStatus('processing')
    try {
      const input = await adapter.stop({ signal: abortController.signal })
      if (abortController.signal.aborted) throw abortError()
      voiceAdapterRef.current = null
      if (input === null) {
        finishInput(abortController)
        return
      }
      await processInput(input, 'voice', abortController)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        finishInput(abortController)
        return
      }
      finishInput(abortController, {
        code: 'VOICE_STOP_FAILED',
        message: 'Voice input could not be processed.',
      })
    }
  }, [finishInput, inputStatus, processInput])

  const cancelInput = useCallback(() => {
    const adapter = voiceAdapterRef.current
    inputAbortRef.current?.abort()
    inputAbortRef.current = null
    voiceAdapterRef.current = null
    if (mountedRef.current) {
      setInputError(null)
      setInputStatus('idle')
    }
    if (adapter?.cancel) {
      void Promise.resolve(adapter.cancel()).catch(() => undefined)
    }
  }, [])

  const resolveConfirmation = useCallback(
    async (approved: boolean): Promise<void> => {
      const waiter = confirmationWaiterRef.current
      const pending = pendingConfirmation
      if (!waiter || !pending) return
      confirmationWaiterRef.current = null
      setPendingConfirmation(null)
      showStatus('working')
      try {
        const outcome = await currentOptionsRef.current.runtime.host.resolveConfirmation(
          pending.outcome.confirmation.id,
          approved,
        )
        waiter.resolve(outcome)
      } catch {
        waiter.reject(new Error('The confirmation could not be resolved.'))
      }
    },
    [pendingConfirmation, showStatus],
  )

  const cancel = useCallback(() => {
    turnAbortRef.current?.abort()
    const pending = pendingConfirmation
    if (pending && confirmationWaiterRef.current) {
      void resolveConfirmation(false)
    }
  }, [pendingConfirmation, resolveConfirmation])

  const clear = useCallback(() => {
    if (turnAbortRef.current || inputAbortRef.current) return
    replaceMessages(initialMessages(currentOptionsRef.current.welcomeMessage))
    setInputError(null)
    setInputStatus('idle')
    showStatus('idle')
  }, [replaceMessages, showStatus])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      turnAbortRef.current?.abort()
      inputAbortRef.current?.abort()
      if (voiceAdapterRef.current?.cancel) {
        void Promise.resolve(voiceAdapterRef.current.cancel()).catch(
          () => undefined,
        )
      }
      confirmationWaiterRef.current?.reject(abortError())
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current)
      }
    }
  }, [])

  return useMemo(
    () => ({
      busy: Boolean(turnAbortRef.current || inputAbortRef.current),
      cancel,
      cancelInput,
      clear,
      inputError,
      inputStatus,
      messages,
      mode,
      pendingConfirmation,
      resolveConfirmation,
      send,
      snapshot,
      startVoiceInput,
      status,
      stopVoiceInput,
      submitInput,
      voiceEnabled: configuredVoiceAdapter(inputPipeline) !== null,
    }),
    [
      cancel,
      cancelInput,
      clear,
      inputError,
      inputPipeline,
      inputStatus,
      messages,
      mode,
      pendingConfirmation,
      resolveConfirmation,
      send,
      snapshot,
      startVoiceInput,
      status,
      stopVoiceInput,
      submitInput,
    ],
  )
}
