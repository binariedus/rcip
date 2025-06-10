import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useId } from 'react';
import { useUIAction } from './UIActionProvider';
const ScopeContext = createContext('');
export function IdScope({ id, label, description, instanceId, children }) {
    const parent = useContext(ScopeContext);
    const auto = useId().replace(/:/g, '_');
    const key = instanceId ?? auto;
    const full = parent ? `${parent}.${id}#${key}` : `${id}#${key}`;
    useUIAction().registerNode(full, label, description);
    return _jsx(ScopeContext.Provider, { value: full, children: children });
}
export function useScope() {
    return useContext(ScopeContext);
}
