export interface ActionDefinition<P = void, R = void> {
  type: 'logic' | 'dom'
  label: string
  description: string
  handler: (payload: P) => R | Promise<R>
  refKey?: string
  meta?: Record<string, any>
}

export type Middleware = (
  ctx: { nodeId: string; actionId: string; payload: any; result?: any },
  next: () => Promise<any>
) => Promise<any>

export interface UIActionInstance {
  registerNode(nodeId: string, label: string, description: string): void
  registerAction<P, R>(
    nodeId: string,
    actionId: string,
    def: ActionDefinition<P, R>
  ): void
  unregisterAction(nodeId: string, actionId: string): void
  invoke<P, R>(nodeId: string, actionId: string, payload: P): Promise<R>
  registerMiddleware(mw: Middleware): void
  describe(): Record<string, Record<string, ActionDefinition<any, any>>>
}

export interface ExecutionContext<P = void, R = void> {
  nodeId: string;
  actionId: string;
  payload: P;
  result?: R;
}
