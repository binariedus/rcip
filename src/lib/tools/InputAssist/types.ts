export type InputAssistState = 'idle' | 'ready' | 'active'

export type InputAssistContext = {
  targetComponentId: string
  getTextActionId: string
  updateTextActionId: string
  metadata?: Record<string, unknown>
}

export type InputAssistMessage = {
  prompt: string
  response?: string
}

export interface InputAssistApi {
  toolId: string
  state: InputAssistState
  context: InputAssistContext | null
  originalText: string
  refinedText: string
  prompt: string
  setPrompt: (v: string) => void
  messages: InputAssistMessage[]
  activate: () => void | Promise<void>
  refine: () => void
  accept: () => void | Promise<void>
  cancel: () => void
  setState: (s: InputAssistState) => void
  updateContext: (c: InputAssistContext) => void | Promise<void>
  clearContext: (targetComponentId: string) => void | Promise<void>
}

