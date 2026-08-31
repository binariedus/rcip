import type {
  RcipApplicationSnapshot,
  RcipInvocationConfirmationRequired,
  RcipInvocationOutcome,
  RcipJsonValue,
} from '../core/types'

/** Capability effects exposed to an assist callback. */
export type RcipAssistMode = 'interactive' | 'read-only'

/** Visual and orchestration state exposed by the headless assist hook. */
export type RcipAssistStatus =
  | 'active'
  | 'attention'
  | 'error'
  | 'idle'
  | 'success'
  | 'working'

/** Lifecycle state for text and voice input before an Assist turn begins. */
export type RcipAssistInputStatus =
  | 'error'
  | 'idle'
  | 'listening'
  | 'processing'
  | 'starting'

/** Origin of an input moving through the configured processor pipeline. */
export type RcipAssistInputOrigin = 'composer' | 'voice'

/** Text input accepted by the Assist input pipeline. */
export interface RcipAssistTextInput {
  readonly text: string
  readonly type: 'text'
}

/** Browser audio input accepted by a transcription-style processor. */
export interface RcipAssistAudioInput {
  readonly data: Blob
  readonly mimeType: string
  readonly type: 'audio'
}

/** Value transformed by ordered Assist input processors. */
export type RcipAssistInput = RcipAssistAudioInput | RcipAssistTextInput

/** Cancellation and live application context supplied to an input processor. */
export interface RcipAssistInputContext {
  readonly origin: RcipAssistInputOrigin
  readonly signal: AbortSignal
  readonly snapshot: RcipApplicationSnapshot
}

/** One ordered audio/text transformation in an Assist input pipeline. */
export interface RcipAssistInputProcessor {
  readonly id: string
  readonly process: (
    input: RcipAssistInput,
    context: RcipAssistInputContext,
  ) => Promise<RcipAssistInput | null>
}

/** Cancellation context supplied to the consumer-owned voice adapter. */
export interface RcipAssistVoiceContext {
  readonly signal: AbortSignal
}

/**
 * Consumer-owned voice capture boundary. RCIP ships a simulation by default;
 * a real adapter may request permission and return audio or text from stop().
 */
export interface RcipAssistVoiceAdapter {
  readonly cancel?: () => Promise<void> | void
  readonly start: (context: RcipAssistVoiceContext) => Promise<void> | void
  readonly stop: (
    context: RcipAssistVoiceContext,
  ) => Promise<RcipAssistInput | null>
}

/** Ordered input processors and optional voice source used by Assist. */
export interface RcipAssistInputPipeline {
  readonly processors?: readonly RcipAssistInputProcessor[]
  readonly voice?: false | RcipAssistVoiceAdapter
}

/** Stable, user-safe failure from voice capture or input processing. */
export interface RcipAssistInputFailure {
  readonly code:
    | 'INPUT_PIPELINE_INCOMPLETE'
    | 'INPUT_PROCESSOR_FAILED'
    | 'VOICE_START_FAILED'
    | 'VOICE_STOP_FAILED'
  readonly message: string
}

/** The three bounded pacing choices an assist callback may request. */
export type RcipAssistDelay = 'long' | 'medium' | 'short'

/** Milliseconds assigned to the callback's symbolic delay choices. */
export interface RcipAssistDelayPresets {
  readonly long: number
  readonly medium: number
  readonly short: number
}

/** One in-memory conversation message owned by an assist session. */
export interface RcipAssistMessage {
  readonly content: string
  readonly createdAt: number
  readonly id: string
  readonly role: 'assistant' | 'user'
}

/** One capability invocation proposed by the consumer callback. */
export interface RcipAssistAction {
  readonly capabilityId: string
  readonly delayAfter: RcipAssistDelay
  readonly id?: string
  readonly input: RcipJsonValue
}

/** A normalized proposed action paired with its authoritative RCIP outcome. */
export interface RcipAssistStep {
  readonly action: RcipAssistAction & { readonly id: string }
  readonly outcome: RcipInvocationOutcome
}

/** Bounded callback phase: decide once, then summarize without more actions. */
export type RcipAssistPhase = 'decide' | 'summarize'

/** Complete provider-neutral input supplied to the consumer callback. */
export interface RcipAssistRequest {
  readonly messages: readonly RcipAssistMessage[]
  readonly mode: RcipAssistMode
  readonly phase: RcipAssistPhase
  readonly snapshot: RcipApplicationSnapshot
  readonly steps: readonly RcipAssistStep[]
  readonly turnId: string
}

/** Text response accepted in either callback phase. */
export interface RcipAssistMessageResponse {
  readonly message: string
  readonly type: 'message'
}

/** One bounded action batch accepted only during the decide phase. */
export interface RcipAssistActionsResponse {
  readonly actions: readonly RcipAssistAction[]
  readonly type: 'actions'
}

/** Response contract implemented by deterministic, API, or model callbacks. */
export type RcipAssistResponse =
  | RcipAssistActionsResponse
  | RcipAssistMessageResponse

/** Per-request callback context that supports cancellation. */
export interface RcipAssistCallbackContext {
  readonly signal: AbortSignal
}

/** Consumer-owned decision boundary; RCIP ships no provider or transport. */
export type RcipAssistDecide = (
  request: RcipAssistRequest,
  context: RcipAssistCallbackContext,
) => Promise<RcipAssistResponse>

/** Confirmation waiting for a direct user decision in the trusted host UI. */
export interface RcipAssistPendingConfirmation {
  readonly action: RcipAssistAction & { readonly id: string }
  readonly outcome: RcipInvocationConfirmationRequired
}
