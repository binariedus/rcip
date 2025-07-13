import { useRcip } from '@lib/core/RcipProvider';
const TOOL_NAME = 'InputAssistTool';
export function useInputAssistHelpers() {
    const engine = useRcip();
    const locateTool = () => engine.findComponents({ componentName: TOOL_NAME })[0]?.componentId ?? '';
    const updateInputAssistContext = (payload) => {
        const id = locateTool();
        if (!id)
            return;
        engine.trigger({ componentId: id, actionName: 'setContext', payload });
    };
    const clearInputAssistContext = (targetComponentId) => {
        const id = locateTool();
        if (!id)
            return;
        engine.trigger({
            componentId: id,
            actionName: 'clearContext',
            payload: { targetComponentId }
        });
    };
    return { updateInputAssistContext, clearInputAssistContext };
}
