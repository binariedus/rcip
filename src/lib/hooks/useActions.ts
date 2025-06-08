import { useEffect, useMemo, useRef } from 'react'
import { useUIAction } from '../context/UIActionProvider'
import { useIdScope } from './useIdScope'
import type { ActionDefinition } from '../core/types'

export function useActions(
  nodeId: string,
  actions: Record<string, ActionDefinition>
): Record<string, (el: HTMLElement | null) => void> {
  const scoped = useIdScope(nodeId)
  const ui = useUIAction()
  const elementRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    Object.entries(actions).forEach(([actionId, def]) => {
      ui.registerAction(scoped, actionId, def)
    })
    return () => {
      Object.keys(actions).forEach(actionId => {
        ui.unregisterAction(scoped, actionId)
      })
    }
  }, [scoped, actions, ui])

  return useMemo(() => {
    const refs: Record<string, (el: HTMLElement | null) => void> = {}
    Object.values(actions).forEach(def => {
      if (def.refKey) refs[def.refKey] = el => (elementRefs.current[def.refKey!] = el)
    })
    return refs
  }, [actions])
}
