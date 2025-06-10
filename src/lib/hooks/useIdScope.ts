import { useScope } from '../context/IdScopeContext'

export function useIdScope(localId: string): string {
  const prefix = useScope()

  return prefix ? `${prefix}.${localId}` : localId
}
