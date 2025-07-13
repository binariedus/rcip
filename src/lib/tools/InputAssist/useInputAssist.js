import { useCallback, useEffect, useRef, useState } from 'react';
import { useRcip } from '@lib/core/RcipProvider';
import { useComponentInterface } from '@lib/core/useComponentInterface';
export function useInputAssist(refine) {
    const { trigger } = useRcip();
    const { componentId: toolId, addAction } = useComponentInterface('InputAssistTool', 'AI-powered text assistant');
    const [state, setState] = useState('idle');
    const [context, setContext] = useState(null);
    const [originalText, setOriginal] = useState('');
    const [refinedText, setRefined] = useState('');
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const ctxRef = useRef(context);
    const stRef = useRef(state);
    const timer = useRef(null);
    useEffect(() => {
        ctxRef.current = context;
        stRef.current = state;
    });
    const reset = useCallback(() => {
        setContext(null);
        setState('idle');
        setOriginal('');
        setRefined('');
        setPrompt('');
        setMessages([]);
    }, []);
    useEffect(() => {
        addAction('setContext', 'Attach context', payload => {
            if (timer.current)
                clearTimeout(timer.current);
            setContext(payload);
            setState('ready');
            setOriginal('');
            setRefined('');
            setPrompt('');
            setMessages([]);
        });
        addAction('clearContext', 'Detach context', ({ targetComponentId }) => {
            if (timer.current)
                clearTimeout(timer.current);
            timer.current = window.setTimeout(() => {
                const same = ctxRef.current?.targetComponentId === targetComponentId;
                if (same && stRef.current !== 'active')
                    reset();
            }, 100);
        });
        return () => {
            if (timer.current)
                clearTimeout(timer.current);
        };
    }, [addAction, reset]);
    const activate = useCallback(async () => {
        if (!context)
            return;
        const { result } = await trigger({
            componentId: context.targetComponentId,
            actionId: context.getTextActionId,
            payload: {}
        });
        if (typeof result === 'string') {
            setOriginal(result);
            setState('active');
        }
    }, [context, trigger]);
    const handleRefine = useCallback(() => {
        if (!prompt.trim() || !context)
            return;
        const next = refine(originalText, prompt, context.metadata);
        setRefined(next);
        setMessages(prev => [...prev, { prompt, response: next }]);
        setPrompt('');
    }, [prompt, originalText, refine, context]);
    const accept = useCallback(async () => {
        if (!context || !refinedText)
            return;
        await trigger({
            componentId: context.targetComponentId,
            actionId: context.updateTextActionId,
            payload: { text: refinedText }
        });
        reset();
    }, [context, refinedText, trigger, reset]);
    const cancel = useCallback(() => reset(), [reset]);
    return {
        toolId,
        state,
        context,
        originalText,
        refinedText,
        prompt,
        setPrompt,
        messages,
        activate,
        refine: handleRefine,
        accept,
        cancel,
        setState,
        updateContext: (c) => trigger({
            componentId: toolId,
            actionName: 'setContext',
            payload: c
        }),
        clearContext: (targetComponentId) => trigger({
            componentId: toolId,
            actionName: 'clearContext',
            payload: { targetComponentId }
        })
    };
}
