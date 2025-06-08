import type {
  ActionDefinition,
  Middleware,
  RegistryMap,
  UIActionInstance
} from './types'

export function createUIAction<M extends RegistryMap = RegistryMap>(): UIActionInstance<M> {
  const registry: Partial<M> = {}
  const middleware: Middleware<M>[] = []

  function registerAction<
    N extends keyof M & string,
    A extends keyof M[N] & string
  >(nodeId: N, actionId: A, def: ActionDefinition<M[N][A]['P'], M[N][A]['R']>) {
    if (!registry[nodeId]) registry[nodeId] = {} as any
    ;(registry[nodeId] as any)[actionId] = def
  }

  function unregisterAction<
    N extends keyof M & string,
    A extends keyof M[N] & string
  >(nodeId: N, actionId: A) {
    const map = registry[nodeId] as any
    if (!map) return
    delete map[actionId]
    if (Object.keys(map).length === 0) delete registry[nodeId]
  }

  async function invoke<
    N extends keyof M & string,
    A extends keyof M[N] & string
  >(nodeId: N, actionId: A, payload: M[N][A]['P']): Promise<M[N][A]['R']> {
    const def = (registry[nodeId] as any)?.[actionId] as ActionDefinition<
      M[N][A]['P'],
      M[N][A]['R']
    >
    if (!def) throw new Error(`Action ${nodeId}.${actionId} not found`)

    const ctx = { nodeId, actionId, payload }
    let i = -1
    const run = async (): Promise<any> => {
      i++
      if (i < middleware.length) return middleware[i](ctx as any, run)
      return def.handler(payload)
    }
    return run() as Promise<M[N][A]['R']>
  }

  function registerMiddleware(mw: Middleware<M>) {
    middleware.push(mw)
  }

  function listNodes(): Array<keyof M & string> {
    return Object.keys(registry) as Array<keyof M & string>
  }

  function listActions<N extends keyof M & string>(
    nodeId: N
  ): (keyof M[N] & string)[] | undefined {
    const map = registry[nodeId] as any
    return map ? (Object.keys(map) as (keyof M[N] & string)[]) : undefined
  }

  function describe(): Partial<M> {
    return registry
  }

  return {
    registerAction,
    unregisterAction,
    invoke,
    registerMiddleware,
    listNodes,
    listActions,
    describe
  }
}
