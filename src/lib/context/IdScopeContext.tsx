import React, { createContext, useContext } from 'react'

import type { ReactNode } from 'react'

const ScopeContext = createContext<string>('')

interface IdScopeProps {
  id: string
  children: ReactNode
}

export const IdScope: React.FC<IdScopeProps> = ({ id, children }) => {
  const parent = useContext(ScopeContext)
  const scope = parent ? `${parent}.${id}` : id
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
}

export function useScope(): string {
  return useContext(ScopeContext)
}
