import { jsx as _jsx } from "react/jsx-runtime";
export default function LauncherButton({ status, onActivate }) {
    const enabled = status === 'ready';
    return (_jsx("button", { style: {
            position: 'fixed',
            right: 16,
            bottom: 16,
            width: 48,
            height: 48,
            borderRadius: 24,
            border: 'none',
            background: status === 'idle' ? '#9ca3af' : '#2563eb',
            color: '#fff',
            fontSize: 22,
            cursor: enabled ? 'pointer' : 'default'
        }, disabled: !enabled, tabIndex: enabled ? 0 : -1, onClick: enabled ? onActivate : undefined, title: "Refine text", children: "\u270E" }));
}
