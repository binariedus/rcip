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
