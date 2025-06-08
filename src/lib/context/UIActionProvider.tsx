import { createContext, useContext, useMemo } from 'react'

import type { ReactNode } from 'react'

import { createUIAction } from '../core/engine'
import type { Middleware, UIActionInstance, RegistryMap } from '../core/types'

const UIActionContext = createContext<UIActionInstance<any> | null>(null)

interface UIActionProviderProps<M extends RegistryMap> {
  children: ReactNode
  middleware?: Middleware<M>[]
}

export function UIActionProvider<M extends RegistryMap>({
                                                          children,
                                                          middleware = []
                                                        }: UIActionProviderProps<M>) {
  const instance = useMemo(() => {
    const ui = createUIAction<M>()
    middleware.forEach(mw => ui.registerMiddleware(mw))
    return ui
  }, [middleware])

  return <UIActionContext.Provider value={instance}>{children}</UIActionContext.Provider>
}

export function useUIAction<M extends RegistryMap = RegistryMap>(): UIActionInstance<M> {
  const context = useContext(UIActionContext) as UIActionInstance<M> | null
  if (!context) throw new Error('useUIAction must be inside UIActionProvider')
  return context
}
