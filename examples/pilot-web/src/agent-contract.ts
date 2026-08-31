import type {
  RcipAssistDecide,
  RcipAssistRequest,
  RcipAssistResponse,
  RcipAssistStep,
} from '@binaried/rcip/assist'

export type PilotAgentRequest = RcipAssistRequest
export type PilotAgentDecision = RcipAssistResponse
export type PilotAgentStep = RcipAssistStep

export interface PilotAgentAdapter {
  readonly decide: RcipAssistDecide
}
