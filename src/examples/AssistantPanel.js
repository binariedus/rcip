import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Drawer, Box, TextField, Button, IconButton, Typography, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useUIAction } from '@lib/context/UIActionProvider';
import { IdScope } from "@lib/context/IdScopeContext";
async function callChat(apiKey, messages) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: 'gpt-4o', messages })
    });
    const { choices } = await res.json();
    return choices?.[0]?.message?.content ?? '';
}
export function AssistantPanel() {
    const ui = useUIAction();
    const [open, setOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [command, setCommand] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit() {
        if (!command.trim())
            return;
        setLoading(true);
        const isRefine = command.startsWith('/refine ');
        const isDescribe = command.startsWith('/describe ');
        const info = await ui.invoke('Editor', 'getInfo', undefined);
        let messages = [
            { role: 'system', content: 'You are an expert technical editor.' },
            { role: 'user', content: `Article (${info.length} chars):\n${info.content}` }
        ];
        if (isRefine) {
            const instruction = command.replace('/refine ', '');
            messages.push({ role: 'user', content: `Please refine: ${instruction}` });
        }
        else if (isDescribe) {
            const topic = command.replace('/describe ', '');
            const registry = ui.describe();
            messages.push({
                role: 'user',
                content: `Describe the component tree and capabilities about: ${topic}\n\nRegistry:\n${JSON.stringify(registry, null, 2)}`
            });
        }
        else {
            messages.push({
                role: 'user',
                content: 'Please enter a command starting with /refine or /describe, e.g. "/refine improve tone".'
            });
        }
        console.log(apiKey, messages);
        const result = await callChat(apiKey, messages);
        setResponse(result);
        if (isRefine) {
            await ui.invoke('Editor', 'updateContent', result);
            setOpen(false);
        }
        setLoading(false);
    }
    return (_jsxs(IdScope, { id: "Assistant", label: "AI Editorial Assistant", description: "Use this panel to refine or describe your article via GPT", children: [_jsx(IconButton, { color: "primary", sx: { position: 'fixed', bottom: 16, right: 16, bgcolor: 'white' }, onClick: () => setOpen(true), children: _jsx(SendIcon, {}) }), _jsx(Drawer, { anchor: "bottom", open: open, onClose: () => setOpen(false), children: _jsx(Box, { p: 2, display: "flex", flexDirection: "column", gap: 2, children: !apiKey ? (_jsxs(_Fragment, { children: [_jsx(TextField, { label: "OpenAI API Key", type: "password", fullWidth: true, value: apiKey, onChange: e => setApiKey(e.target.value) }), _jsx(Button, { variant: "contained", onClick: () => apiKey && setOpen(true), disabled: !apiKey, children: "Save & Continue" })] })) : (_jsxs(_Fragment, { children: [_jsxs(Box, { display: "flex", alignItems: "center", justifyContent: "space-between", children: [_jsx(Typography, { variant: "subtitle1", children: "Enter Command" }), _jsx(IconButton, { onClick: () => setOpen(false), children: _jsx(CloseIcon, {}) })] }), _jsx(TextField, { multiline: true, rows: 3, placeholder: "e.g. /refine improve introduction", fullWidth: true, value: command, onChange: e => setCommand(e.target.value) }), _jsxs(Box, { display: "flex", gap: 2, children: [_jsx(Button, { variant: "contained", onClick: handleSubmit, startIcon: loading ? _jsx(CircularProgress, { size: 20 }) : _jsx(SendIcon, {}), disabled: loading, children: "Submit" }), !command.startsWith('/refine') && !command.startsWith('/describe') && (_jsx(Button, { variant: "outlined", onClick: () => setResponse(null), children: "Help" }))] }), response && (_jsx(Box, { mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1, children: _jsx(Typography, { variant: "body1", component: "pre", children: response }) }))] })) }) })] }));
}
