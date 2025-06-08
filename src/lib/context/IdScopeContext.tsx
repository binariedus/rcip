import { createContext, useContext, useId, ReactNode, FC } from 'react'

const ScopeContext = createContext<string>('')

interface IdScopeProps {
  id: string
  instanceId?: string
  children: ReactNode
}

export const IdScope: FC<IdScopeProps> = ({ id, instanceId, children }) => {
  const parent = useContext(ScopeContext)
  const auto = useId().replace(/:/g, '_')
  const key = instanceId ?? auto
  const scope = parent ? `${parent}.${id}#${key}` : `${id}#${key}`
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
}

export function useScope(): string {
  return useContext(ScopeContext)
}
