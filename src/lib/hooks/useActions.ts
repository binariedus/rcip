import { useEffect, useMemo, useRef } from 'react'
import { useUIAction } from '../context/UIActionProvider'
import { useIdScope } from './useIdScope'
import type { ActionDefinition, RegistryMap } from '../core/types'

export function useActions<M extends RegistryMap, N extends keyof M & string>(
  nodeId: N,
  actions: { [A in keyof M[N]]: ActionDefinition<M[N][A]['P'], M[N][A]['R']> }
): Record<string, (el: HTMLElement | null) => void> {
  const scoped = useIdScope(nodeId)
  const ui = useUIAction<M>()
  const elementRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    Object.entries(actions).forEach(([actionId, def]) => {
      ui.registerAction(scoped as N, actionId as keyof M[N] & string, def as any)
    })
  }, [scoped, actions, ui])

  return useMemo(() => {
    const cb: Record<string, (el: HTMLElement | null) => void> = {}
    Object.values(actions).forEach(def => {
      if (def.refKey) {
        cb[def.refKey] = el => {
          elementRefs.current[def.refKey!] = el
        }
      }
    })
    return cb
  }, [actions])
}
