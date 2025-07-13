export type ComponentId = string
export type ComponentName = string
export type ActionId = string
export type ActionName = string
export type Description = string

export interface ActionDescriptor<Payload = unknown, Result = unknown> {
  actionId: ActionId
  actionName: ActionName
  description: Description
  execute: (payload: Payload) => Result | Promise<Result>
}

export interface ComponentRecord {
  componentId: ComponentId
  componentName: ComponentName
  description: Description
  actions: Map<ActionId, ActionDescriptor<any, any>>
}

export interface TriggerRequest<Payload = unknown> {
  componentId?: ComponentId
  componentName?: ComponentName
  actionId?: ActionId
  actionName?: ActionName
  payload: Payload
  metadata?: Record<string, unknown>
}

export interface TriggerResponse<Result = unknown> {
  result?: Result
  error?: unknown
}

export interface RegisterComponentParam {
  componentId?: ComponentId;
  componentName?: ComponentName;
  description?: Description;
}

export interface RegistryController {
  registerComponent: (registerComponentParam: RegisterComponentParam) => ComponentId
  unregisterComponent: (componentId: ComponentId) => void
  registerAction: <P, R>(
    componentId: ComponentId,
    actionName: ActionName,
    description: string,
    execute: (payload: P) => R | Promise<R>
  ) => ActionId
  unregisterAction: (componentId: ComponentId, actionId: ActionId) => void
  findComponents: (criteria: { componentId?: ComponentId; componentName?: ComponentName }) => ComponentRecord[]
  findActions: (criteria: {
    componentId?: ComponentId
    componentName?: ComponentName
    actionId?: ActionId
    actionName?: ActionName
  }) => [ComponentRecord, ActionDescriptor][]
  trigger: <P, R>(request: TriggerRequest<P>) => Promise<TriggerResponse<R>>
}
