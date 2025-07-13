import { useRcip } from '@lib/core/RcipProvider'
import { InputAssistContext } from './types'

const TOOL_NAME = 'InputAssistTool'

export function useInputAssistHelpers() {
  const engine = useRcip()

  const locateTool = () =>
    engine.findComponents({ componentName: TOOL_NAME })[0]?.componentId ?? ''

  const updateInputAssistContext = (payload: InputAssistContext) => {
    const id = locateTool()

    if (!id) return
    engine.trigger({ componentId: id, actionName: 'setContext', payload })
  }

  const clearInputAssistContext = (targetComponentId: string) => {
    const id = locateTool()
    if (!id) return
    engine.trigger({
      componentId: id,
      actionName: 'clearContext',
      payload: { targetComponentId }
    })
  }

  return { updateInputAssistContext, clearInputAssistContext }
}
