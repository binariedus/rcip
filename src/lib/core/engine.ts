import type { ActionDefinition, RegistryMap, UIActionInstance } from './types'

export function createUIAction<M extends RegistryMap = RegistryMap>(): UIActionInstance<M> {
  const registry: Partial<M> = {}
  const middlewareList: any[] = []

  function registerAction<N extends keyof M & string, A extends keyof M[N] & string>(
    nodeId: N,
    actionId: A,
    definition: ActionDefinition<M[N][A]['P'], M[N][A]['R']>
  ): void {
    if (!registry[nodeId]) registry[nodeId] = {} as any
    ;(registry[nodeId] as any)[actionId] = definition
  }

  async function invoke<N extends keyof M & string, A extends keyof M[N] & string>(
    nodeId: N,
    actionId: A,
    payload: M[N][A]['P']
  ): Promise<M[N][A]['R']> {
    const definition = (registry[nodeId] as any)?.[actionId] as ActionDefinition<
      M[N][A]['P'],
      M[N][A]['R']
    >
    if (!definition) throw new Error(`Action ${nodeId}.${actionId} not found`)

    const context = { nodeId, actionId, payload }
    let idx = -1
    const next = async (): Promise<unknown> => {
      idx++
      if (idx < middlewareList.length) return middlewareList[idx](context, next)
      return definition.handler(payload)
    }
    return next() as Promise<M[N][A]['R']>
  }

  function registerMiddleware(mw: any): void {
    middlewareList.push(mw)
  }

  return { registerAction, invoke, registerMiddleware }
}
