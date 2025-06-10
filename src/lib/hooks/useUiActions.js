import { useEffect, useRef, useCallback } from 'react';
import { useUIAction } from '../context/UIActionProvider';
import { useIdScope } from './useIdScope';
export function useUiActions(nodeId) {
    const scoped = useIdScope(nodeId);
    const ui = useUIAction();
    const added = useRef(new Set());
    const addAction = useCallback((id, def) => {
        if (added.current.has(id))
            return;
        ui.registerAction(scoped, id, def);
        added.current.add(id);
    }, [scoped, ui]);
    useEffect(() => () => {
        added.current.forEach(id => ui.unregisterAction(scoped, id));
        added.current.clear();
    }, [scoped, ui]);
    return addAction;
}
