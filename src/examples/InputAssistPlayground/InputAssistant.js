import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useInputAssist } from '@lib/tools/InputAssist';
import LauncherButton from "./LauncherButton";
export default function InputAssistModal() {
    const assist = useInputAssist((orig, prompt) => `✨ ${prompt}: ${orig}`);
    if (assist.state !== 'active') {
        return (_jsx(LauncherButton, { status: assist.state, onActivate: () => assist.activate() }));
    }
    return (_jsxs("div", { style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 600,
            background: '#fff',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            zIndex: 1000
        }, children: [_jsx("div", { style: { fontWeight: 600 }, children: assist.context?.metadata?.title ?? 'Assist' }), _jsx("textarea", { style: { width: '100%', height: 100, padding: 8, border: '1px solid #ddd' }, readOnly: true, value: assist.originalText }), _jsx("textarea", { style: { width: '100%', height: 100, padding: 8, border: '1px solid #ddd', background: '#eef' }, readOnly: true, value: assist.refinedText }), _jsx("input", { style: { flex: 1, padding: 8, border: '1px solid #ddd' }, value: assist.prompt, onChange: e => assist.setPrompt(e.target.value), onKeyDown: e => e.key === 'Enter' && assist.refine(), placeholder: "Type instruction\u2026" }), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsx("button", { onClick: assist.cancel, children: "Cancel" }), _jsx("button", { disabled: !assist.refinedText, onClick: assist.accept, children: "Accept" })] })] }));
}
