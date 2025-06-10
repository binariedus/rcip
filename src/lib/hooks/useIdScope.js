import { useScope } from '../context/IdScopeContext';
export function useIdScope(localId) {
    const prefix = useScope();
    return prefix ? `${prefix}.${localId}` : localId;
}
