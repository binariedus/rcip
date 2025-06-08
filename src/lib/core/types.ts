
export interface InvokeContext<M extends RegistryMap = RegistryMap> {
  nodeId: keyof M & string
  actionId: keyof M[keyof M] & string
  payload: M[keyof M][keyof M[keyof M]]['P']
  result?: M[keyof M][keyof M[keyof M]]['R']
}

export interface ActionDefinition<P, R = void> {
  type: 'logic' | 'dom'
  label: string
  handler: (payload: P) => R | Promise<R>
  refKey?: string
  meta?: Record<string, unknown>
}

export interface RegistryMap {
  [nodeId: string]: {
    [actionId: string]: { P: any; R: any }
  }
}

export type Middleware<M extends RegistryMap = RegistryMap> = (
  context: InvokeContext<M>,
  next: () => Promise<any>
) => Promise<any>


export interface UIActionInstance<M extends RegistryMap = RegistryMap> {
  registerAction: <N extends keyof M & string, A extends keyof M[N] & string>(
    nodeId: N,
    actionId: A,
    definition: ActionDefinition<M[N][A]['P'], M[N][A]['R']>
  ) => void
  invoke: <N extends keyof M & string, A extends keyof M[N] & string>(
    nodeId: N,
    actionId: A,
    payload: M[N][A]['P']
  ) => Promise<M[N][A]['R']>
  registerMiddleware: (middleware: Middleware<M>) => void
}

export type CounterMap = {
  CounterBox: {
    incrementBy: { P: number; R: void }
  }
}

