import { useState, useRef, useEffect } from 'react'
import {useComponentInterface} from "@lib/core/useComponentInterface";

export function useInputInterface(initial: string, title: string) {
  const [text, setText] = useState(initial)
  const textRef = useRef(text)
  useEffect(() => {
    textRef.current = text
  }, [text])

  const { componentId, addAction } = useComponentInterface(
    'TextInput',
    'Input field with assist'
  )

  const actions = useRef({ get: '', update: '' })
  useEffect(() => {
    actions.current.get = addAction('getText', 'Return text', () => textRef.current)
    actions.current.update = addAction<{ text: string }, void>('setText', 'Set text', ({ text }) => setText(text))
  }, [addAction])

  return { componentId, text, setText, actions: actions.current, metadata: { title } }
}
