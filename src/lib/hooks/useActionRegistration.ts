import { useEffect } from 'react'
import { useUIAction } from '../context/UIActionProvider'
import { useIdScope } from './useIdScope'
import type { ActionDefinition } from '../core/types'

export function useActionRegistration<P, R>(
  nodeId: string,
  actionId: string,
  definition: ActionDefinition<P, R>
) {
  const scoped = useIdScope(nodeId)
  const ui = useUIAction()
  useEffect(() => {
    ui.registerAction(scoped, actionId, definition)
    return () => ui.unregisterAction(scoped, actionId)
  }, [scoped, actionId, definition, ui])
}
