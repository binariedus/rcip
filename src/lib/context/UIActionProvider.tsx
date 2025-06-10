import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { createUIAction } from '../core/engine'
import type { Middleware, UIActionInstance } from '../core/types'

const UIActionContext = createContext<UIActionInstance | null>(null)

interface Props {
  children: ReactNode
  middleware?: Middleware[]
}

export function UIActionProvider({ children, middleware = [] }: Props) {
  const instance = useMemo(() => {
    const ui = createUIAction()
    middleware.forEach(ui.registerMiddleware)
    return ui
  }, [middleware])

  return (
    <UIActionContext.Provider value={instance}>{children}</UIActionContext.Provider>
  )
}

export function useUIAction(): UIActionInstance {
  const ui = useContext(UIActionContext)
  if (!ui) throw new Error('useUIAction must be inside UIActionProvider')
  return ui
}
