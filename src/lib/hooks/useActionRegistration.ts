import { useEffect } from 'react'
import { useUIAction } from '../context/UIActionProvider'
import { useIdScope } from './useIdScope'
import type { ActionDefinition } from '../core/types'

export function useActionRegistration<P, R>(
  nodeId: string,
  actionId: string,
  definition: ActionDefinition<P, R>
): void {
  const scoped = useIdScope(nodeId)
  const ui = useUIAction()

  useEffect(() => {
    ui.registerAction(scoped as any, actionId as any, definition)
    return () => {
      ui.unregisterAction(scoped as any, actionId as any)
    }
  }, [scoped, actionId, definition, ui])
}
