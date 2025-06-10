import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { UIActionProvider } from '@lib/context/UIActionProvider';
import { ArticleEditor } from './ArticleEditor';
import { AssistantPanel } from './AssistantPanel';
export function App() {
    return (_jsxs(UIActionProvider, { children: [_jsx(ArticleEditor, {}), _jsx(AssistantPanel, {})] }));
}
