export interface RegistryMap {
  [nodeId: string]: {
    _meta: { label: string; description: string }
    [actionId: string]: { P: any; R: any } | any
  }
}

export interface InvokeContext {
  nodeId: string
  actionId: string
  payload: unknown
  result?: unknown
}

export interface ActionDefinition<P, R = void> {
  type: 'logic' | 'dom'
  label: string
  description: string
  handler: (payload: P) => R | Promise<R>
  refKey?: string
  meta?: Record<string, unknown>
}

export type Middleware = (
  ctx: InvokeContext,
  next: () => Promise<any>
) => Promise<any>

export interface UIActionInstance {
  registerNode: (nodeId: string, label: string, description: string) => void
  registerAction: (nodeId: string, actionId: string, def: ActionDefinition<any, any>) => void
  unregisterAction: (nodeId: string, actionId: string) => void
  invoke: <P, R>(nodeId: string, actionId: string, payload: P) => Promise<R>
  registerMiddleware: (mw: Middleware) => void
  describe: () => RegistryMap
}
