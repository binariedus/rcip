import type {ActionDefinition, ExecutionContext, Middleware, UIActionInstance} from './types'

export function createUIAction(): UIActionInstance {
  const registry: Record<
    string,
    { _meta?: { label: string; description: string } } &
    Record<string, ActionDefinition<any, any>>
  > = {}

  const middlewareList: Middleware[] = []

  function registerNode(nodeId: string, label: string, description: string) {
    if (!registry[nodeId]) registry[nodeId] = {}
    registry[nodeId]._meta = { label, description }
  }

  function registerAction<P, R>(
    nodeId: string,
    actionId: string,
    def: ActionDefinition<P, R>
  ) {
    registerNode(nodeId, def.label, def.description)
    registry[nodeId][actionId] = def as ActionDefinition<any, any>
  }

  function unregisterAction(nodeId: string, actionId: string) {
    const node = registry[nodeId]
    if (!node) return
    delete node[actionId]
    if (Object.keys(node).length === 1) delete registry[nodeId]
  }

  async function invoke<P, R>(
    nodeId: string,
    actionId: string,
    payload: P
  ): Promise<R> {

    console.log({
      nodeId,
      registry
    })

    const node = registry[nodeId]
    if (!node) throw new Error(`Node ${nodeId} not found`)
    const def = node[actionId] as ActionDefinition<P, R> | undefined
    if (!def) throw new Error(`Action ${actionId} not found on ${nodeId}`)
    let idx = -1
    const ctx: ExecutionContext<P, R> = { nodeId, actionId, payload }
    const run = async (): Promise<any> => {
      idx++
      if (idx < middlewareList.length) return middlewareList[idx](ctx, run)
      const res = await def.handler(payload)
      ctx.result = res
      return res
    }
    return run() as Promise<R>
  }

  function registerMiddleware(mw: Middleware) {
    middlewareList.push(mw)
  }

  function describe() {
    return registry
  }

  return {
    registerNode,
    registerAction,
    unregisterAction,
    invoke,
    registerMiddleware,
    describe
  }
}
