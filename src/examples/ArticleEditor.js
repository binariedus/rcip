import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, TextField } from '@mui/material';
import { useUiActions } from '@lib/hooks/useUiActions';
import { IdScope } from "@lib/context/IdScopeContext";
export function ArticleEditor() {
    const [content, setContent] = useState('Start writing your article here…');
    const add = useUiActions('Editor');
    const updateDef = {
        type: 'logic',
        label: 'Update Article',
        description: 'Replace the full article text with new content',
        handler: v => setContent(v)
    };
    const infoDef = {
        type: 'logic',
        label: 'Get Article Info',
        description: 'Retrieve current article text and its length',
        handler: () => ({ content, length: content.length })
    };
    useEffect(() => {
        add('updateContent', updateDef);
        add('getInfo', infoDef);
    }, [add]);
    function onChange(e) {
        setContent(e.target.value);
    }
    return (_jsx(IdScope, { id: "Editor", label: "Article Editor", description: "Rich text editor for writing and previewing articles", children: _jsx(Box, { p: 2, maxWidth: "800px", mx: "auto", mt: 4, children: _jsx(TextField, { label: "Article Content", variant: "outlined", multiline: true, rows: 12, fullWidth: true, value: content, onChange: onChange }) }) }));
}
