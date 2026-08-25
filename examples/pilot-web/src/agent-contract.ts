import type {
  RcipApplicationSnapshot,
  RcipInvocationOutcome,
  RcipJsonValue,
} from '@binaried/rcip/core'

export interface PilotAgentCall {
  readonly callId: string
  readonly capabilityId: string
  readonly input: RcipJsonValue
}

export interface PilotAgentStep {
  readonly call: PilotAgentCall
  readonly outcome: RcipInvocationOutcome
}

export interface PilotAgentRequest {
  readonly message: string
  readonly snapshot: RcipApplicationSnapshot
  readonly steps: readonly PilotAgentStep[]
}

export type PilotAgentDecision =
  | {
      readonly adapter: 'deterministic' | 'openai'
      readonly type: 'message'
      readonly message: string
    }
  | {
      readonly adapter: 'deterministic' | 'openai'
      readonly type: 'calls'
      readonly calls: readonly PilotAgentCall[]
    }

export interface PilotAgentAdapter {
  readonly decide: (
    request: PilotAgentRequest,
  ) => Promise<PilotAgentDecision>
}
