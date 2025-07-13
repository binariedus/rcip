import { useInputAssistHelpers } from '@lib/tools/InputAssist'
import { useInputInterface } from './useInputInterface'

export default function InputEditor() {
  const { updateInputAssistContext, clearInputAssistContext } = useInputAssistHelpers()
  const { componentId, text, setText, actions, metadata } = useInputInterface('', 'Hello World')

  const focus = () =>
    updateInputAssistContext({
      targetComponentId: componentId,
      getTextActionId: actions.get,
      updateTextActionId: actions.update,
      metadata
    })

  const blur = () => clearInputAssistContext(componentId)

  return (
    <textarea
      style={{ width: 400, minHeight: 120 }}
      value={text}
      onChange={e => setText(e.target.value)}
      onFocus={focus}
      onBlur={blur}
    />
  )

}
