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
