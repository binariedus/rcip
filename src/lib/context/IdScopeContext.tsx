import { createContext, useContext, useId } from 'react'
import type { ReactNode } from 'react'
import { useUIAction } from './UIActionProvider'

const ScopeContext = createContext<string>('')

interface Props {
  id: string
  label: string
  description: string
  instanceId?: string
  children: ReactNode
}

export function IdScope({
                          id,
                          label,
                          description,
                          instanceId,
                          children
                        }: Props) {
  const parent = useContext(ScopeContext)
  const auto = useId().replace(/:/g, '_')
  const key = instanceId ?? auto
  const full = parent ? `${parent}.${id}#${key}` : `${id}#${key}`
  useUIAction().registerNode(full, label, description)
  return <ScopeContext.Provider value={full}>{children}</ScopeContext.Provider>
}

export function useScope(): string {
  return useContext(ScopeContext)
}
