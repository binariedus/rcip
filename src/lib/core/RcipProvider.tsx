import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import {
  ActionDescriptor,
  ActionId,
  ActionName,
  ComponentId,
  ComponentName,
  ComponentRecord, RegisterComponentParam,
  RegistryController,
  TriggerRequest,
  TriggerResponse
} from './types'

const RcipContext = createContext<RegistryController | null>(null)

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function RcipProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Map<ComponentId, ComponentRecord>>(new Map())

  const registerComponent = useCallback((registerComponentParam: RegisterComponentParam): ComponentId => {
    const componentId = registerComponentParam.componentId || makeId(registerComponentParam.componentName || 'test-component')

    const record: ComponentRecord = {
      componentId,
      componentName: registerComponentParam.componentName || 'test-component',
      description: registerComponentParam.description || '',
      actions: new Map()
    }
    setRecords(prev => new Map(prev).set(componentId, record))
    return componentId
  }, [])

  const unregisterComponent = useCallback((componentId: ComponentId) => {
    setRecords(prev => {
      const next = new Map(prev)
      next.delete(componentId)
      return next
    })
  }, [])

  const registerAction = useCallback(
    <P, R>(
      componentId: ComponentId,
      actionName: ActionName,
      description: string,
      execute: (payload: P) => R | Promise<R>
    ): ActionId => {
      const actionId = makeId(actionName)
      const descriptor: ActionDescriptor<P, R> = { actionId, actionName, description, execute }
      setRecords(prev => {
        const next = new Map(prev)
        const comp = next.get(componentId)
        if (comp) comp.actions.set(actionId, descriptor)
        return next
      })
      return actionId
    },
    []
  )

  const unregisterAction = useCallback((componentId: ComponentId, actionId: ActionId) => {
    setRecords(prev => {
      const next = new Map(prev)
      const comp = next.get(componentId)
      if (comp) comp.actions.delete(actionId)
      return next
    })
  }, [])

  const findComponents = useCallback(
    (criteria: { componentId?: ComponentId; componentName?: ComponentName }) => {
      const result: ComponentRecord[] = []
      records.forEach(record => {
        if (
          (criteria.componentId === undefined || record.componentId === criteria.componentId) &&
          (criteria.componentName === undefined || record.componentName === criteria.componentName)
        )
          result.push(record)
      })
      return result
    },
    [records]
  )

  const findActions = useCallback(
    (criteria: {
      componentId?: ComponentId
      componentName?: ComponentName
      actionId?: ActionId
      actionName?: ActionName
    }) => {
      const matches: [ComponentRecord, ActionDescriptor][] = []
      records.forEach(record => {
        if (
          (criteria.componentId !== undefined && record.componentId !== criteria.componentId) ||
          (criteria.componentName !== undefined && record.componentName !== criteria.componentName)
        )
          return
        record.actions.forEach(action => {
          if (
            (criteria.actionId === undefined || action.actionId === criteria.actionId) &&
            (criteria.actionName === undefined || action.actionName === criteria.actionName)
          )
            matches.push([record, action])
        })
      })
      return matches
    },
    [records]
  )

  const trigger = useCallback(
    async <P, R>(request: TriggerRequest<P>): Promise<TriggerResponse<R>> => {

      const { componentId, componentName, actionId, actionName, payload } = request
      const comps = findComponents({ componentId, componentName })
      if (comps.length === 0) return { error: 'component_not_found' }
      const comp = comps[0]
      let action: ActionDescriptor | undefined
      if (actionId) action = comp.actions.get(actionId)
      else if (actionName)
        action = Array.from(comp.actions.values()).find(a => a.actionName === actionName)
      if (!action) return { error: 'action_not_found' }
      try {
        const result = await action.execute(payload) as R
        return { result }
      } catch (e) {
        return { error: e }
      }
    },
    [findComponents]
  )

  const controller: RegistryController = useMemo(
    () => ({
      registerComponent,
      unregisterComponent,
      registerAction,
      unregisterAction,
      findComponents,
      findActions,
      trigger
    }),
    [
      registerComponent,
      unregisterComponent,
      registerAction,
      unregisterAction,
      findComponents,
      findActions,
      trigger
    ]
  )

  return <RcipContext.Provider value={controller}>{children}</RcipContext.Provider>
}

export function useRcip() {
  const ctx = useContext(RcipContext)
  if (!ctx) throw new Error('useRcip must be used within RcipProvider')
  return ctx
}
