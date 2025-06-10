import { useEffect, useRef, useCallback } from 'react'
import { useUIAction } from '../context/UIActionProvider'
import { useIdScope } from './useIdScope'
import type { ActionDefinition } from '../core/types'

export function useUiActions(nodeId: string) {
  const scoped = useIdScope(nodeId)

  const ui = useUIAction()
  const added = useRef<Set<string>>(new Set())

  const addAction = useCallback(
    <P, R>(id: string, def: ActionDefinition<P, R>) => {
      if (added.current.has(id)) return
      ui.registerAction(scoped, id, def)
      added.current.add(id)
    },
    [scoped, ui]
  )

  useEffect(
    () => () => {
      added.current.forEach(id => ui.unregisterAction(scoped, id))
      added.current.clear()
    },
    [scoped, ui]
  )

  return addAction
}
