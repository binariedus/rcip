import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react'

import type {
  RcipApplicationSnapshot,
  RcipCapabilityBinding,
  RcipCapabilityDefinition,
  RcipJsonPrimitive,
  RcipJsonValue,
  RcipRuntime,
  RcipSemanticContext,
} from '../core/types'

const RcipReactContext = createContext<RcipRuntime | null>(null)

/** Props for the React provider that installs one host-owned runtime. */
export interface RcipProviderProps {
  readonly children: ReactNode
  readonly runtime: RcipRuntime
}

/**
 * A React capability binding with an optional revision used to refresh
 * availability when consumer state changes.
 */
export interface RcipReactCapabilityBinding<
  Input extends RcipJsonValue,
  Output extends RcipJsonValue,
> extends RcipCapabilityBinding<Input, Output> {
  readonly revision?: RcipJsonPrimitive
}

/** Provides one host-owned RCIP runtime to React bindings and client hooks. */
export function RcipProvider({
  children,
  runtime,
}: RcipProviderProps): ReactNode {
  return (
    <RcipReactContext.Provider value={runtime}>
      {children}
    </RcipReactContext.Provider>
  )
}

function useRcipRuntime(): RcipRuntime {
  const runtime = useContext(RcipReactContext)
  if (!runtime) {
    throw new Error('useRcipRuntime must be used within RcipProvider.')
  }
  return runtime
}

/** Returns the narrow tool-facing client from the nearest RCIP provider. */
export function useRcipClient(): RcipRuntime['client'] {
  return useRcipRuntime().client
}

/** Subscribes to the live serializable discovery snapshot. */
export function useRcipSnapshot(): RcipApplicationSnapshot {
  const client = useRcipClient()
  return useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  )
}

/** Publishes the host application's current semantic scopes. */
export function useRcipContext(context: RcipSemanticContext): void {
  const runtime = useRcipRuntime()
  const activeScopeKey = context.activeScopeIds.join('\u001f')
  const contextRef = useRef(context)
  contextRef.current = context

  useEffect(() => {
    runtime.host.setContext(contextRef.current)
    return () => runtime.host.setContext({ activeScopeIds: [] })
  }, [activeScopeKey, context.primaryScopeId, runtime])
}

/** Binds a declared capability to live React feature behavior. */
export function useRcipCapability<
  Input extends RcipJsonValue,
  Output extends RcipJsonValue,
>(
  definition: RcipCapabilityDefinition<Input, Output>,
  binding: RcipReactCapabilityBinding<Input, Output>,
): void {
  const runtime = useRcipRuntime()
  const bindingRef = useRef(binding)
  useEffect(() => {
    bindingRef.current = binding
  })

  useEffect(
    () =>
      runtime.host.bindCapability(definition, {
        execute: (input, executionContext) =>
          bindingRef.current.execute(input, executionContext),
        getAvailability: () =>
          bindingRef.current.getAvailability?.() ?? { available: true },
      }),
    [definition, runtime],
  )

  useEffect(() => {
    runtime.host.refresh()
  }, [binding.revision, runtime])
}
