import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { createUIAction } from '../core/engine';
const UIActionContext = createContext(null);
export function UIActionProvider({ children, middleware = [] }) {
    const instance = useMemo(() => {
        const ui = createUIAction();
        middleware.forEach(ui.registerMiddleware);
        return ui;
    }, [middleware]);
    return (_jsx(UIActionContext.Provider, { value: instance, children: children }));
}
export function useUIAction() {
    const ui = useContext(UIActionContext);
    if (!ui)
        throw new Error('useUIAction must be inside UIActionProvider');
    return ui;
}
