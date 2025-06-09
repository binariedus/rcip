import type {ActionDefinition, Middleware, UIActionInstance, RegistryMap, InvokeContext} from './types'

export function createUIAction(): UIActionInstance {
  const registry: RegistryMap = {}
  const middleware: Middleware[] = []

  function registerNode(nodeId: string, label: string, description: string) {
    if (!registry[nodeId]) registry[nodeId] = { _meta: { label, description } }
  }

  function registerAction(nodeId: string, actionId: string, def: ActionDefinition<any, any>) {
    registerNode(nodeId, def.label, def.description)
    registry[nodeId][actionId] = { ...def }
  }

  function unregisterAction(nodeId: string, actionId: string) {
    const node = registry[nodeId]
    if (!node) return
    delete node[actionId]
    if (Object.keys(node).length === 1) delete registry[nodeId]
  }

  async function invoke<P, R>(nodeId: string, actionId: string, payload: P): Promise<R> {
    const node = registry[nodeId]
    if (!node) throw new Error(`Node ${nodeId} not found`)
    const def = node[actionId] as ActionDefinition<P, R>
    if (!def) throw new Error(`Action ${actionId} not found on ${nodeId}`)
    const ctx = { nodeId, actionId, payload } as InvokeContext
    let idx = -1
    const dispatch = async (): Promise<any> => {
      idx++
      if (idx < middleware.length) return middleware[idx](ctx, dispatch)
      const res = await def.handler(payload)
      ctx.result = res
      return res
    }
    return dispatch() as Promise<R>
  }

  function registerMiddleware(mw: Middleware) {
    middleware.push(mw)
  }

  function describe() {
    return registry
  }

  return { registerNode, registerAction, unregisterAction, invoke, registerMiddleware, describe }
}
