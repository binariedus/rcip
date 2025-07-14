import { jsx as _jsx } from "react/jsx-runtime";
import { useInputAssist, useInputAssistInterface } from '@lib/tools/InputAssist';
export default function InputEditor() {
    const assist = useInputAssist();
    const { componentId, text, setText, actions, metadata } = useInputAssistInterface('', 'Hello World');
    const focus = () => assist.updateContext({
        targetComponentId: componentId,
        getTextActionId: actions.get,
        updateTextActionId: actions.update,
        metadata
    });
    const blur = () => assist.clearContext(componentId);
    return (_jsx("textarea", { style: { width: 400, minHeight: 120 }, value: text, onChange: e => setText(e.target.value), onFocus: focus, onBlur: blur }));
}
