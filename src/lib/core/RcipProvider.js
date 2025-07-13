import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
const RcipContext = createContext(null);
export function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
export function RcipProvider({ children }) {
    const [records, setRecords] = useState(new Map());
    const registerComponent = useCallback((registerComponentParam) => {
        const componentId = registerComponentParam.componentId || makeId(registerComponentParam.componentName || 'test-component');
        const record = {
            componentId,
            componentName: registerComponentParam.componentName || 'test-component',
            description: registerComponentParam.description || '',
            actions: new Map()
        };
        setRecords(prev => new Map(prev).set(componentId, record));
        return componentId;
    }, []);
    const unregisterComponent = useCallback((componentId) => {
        setRecords(prev => {
            const next = new Map(prev);
            next.delete(componentId);
            return next;
        });
    }, []);
    const registerAction = useCallback((componentId, actionName, description, execute) => {
        const actionId = makeId(actionName);
        const descriptor = { actionId, actionName, description, execute };
        setRecords(prev => {
            const next = new Map(prev);
            const comp = next.get(componentId);
            if (comp)
                comp.actions.set(actionId, descriptor);
            return next;
        });
        return actionId;
    }, []);
    const unregisterAction = useCallback((componentId, actionId) => {
        setRecords(prev => {
            const next = new Map(prev);
            const comp = next.get(componentId);
            if (comp)
                comp.actions.delete(actionId);
            return next;
        });
    }, []);
    const findComponents = useCallback((criteria) => {
        const result = [];
        records.forEach(record => {
            if ((criteria.componentId === undefined || record.componentId === criteria.componentId) &&
                (criteria.componentName === undefined || record.componentName === criteria.componentName))
                result.push(record);
        });
        return result;
    }, [records]);
    const findActions = useCallback((criteria) => {
        const matches = [];
        records.forEach(record => {
            if ((criteria.componentId !== undefined && record.componentId !== criteria.componentId) ||
                (criteria.componentName !== undefined && record.componentName !== criteria.componentName))
                return;
            record.actions.forEach(action => {
                if ((criteria.actionId === undefined || action.actionId === criteria.actionId) &&
                    (criteria.actionName === undefined || action.actionName === criteria.actionName))
                    matches.push([record, action]);
            });
        });
        return matches;
    }, [records]);
    const trigger = useCallback(async (request) => {
        const { componentId, componentName, actionId, actionName, payload } = request;
        const comps = findComponents({ componentId, componentName });
        if (comps.length === 0)
            return { error: 'component_not_found' };
        const comp = comps[0];
        let action;
        if (actionId)
            action = comp.actions.get(actionId);
        else if (actionName)
            action = Array.from(comp.actions.values()).find(a => a.actionName === actionName);
        if (!action)
            return { error: 'action_not_found' };
        try {
            const result = await action.execute(payload);
            return { result };
        }
        catch (e) {
            return { error: e };
        }
    }, [findComponents]);
    const controller = useMemo(() => ({
        registerComponent,
        unregisterComponent,
        registerAction,
        unregisterAction,
        findComponents,
        findActions,
        trigger
    }), [
        registerComponent,
        unregisterComponent,
        registerAction,
        unregisterAction,
        findComponents,
        findActions,
        trigger
    ]);
    return _jsx(RcipContext.Provider, { value: controller, children: children });
}
export function useRcip() {
    const ctx = useContext(RcipContext);
    if (!ctx)
        throw new Error('useRcip must be used within RcipProvider');
    return ctx;
}
