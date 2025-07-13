import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { RcipProvider } from '../../lib';
import InputAssistModal from "./InputAssistant";
import InputEditor from "./InputEditor";
const App = () => (_jsx(RcipProvider, { children: _jsxs("div", { style: { padding: 32, fontFamily: 'sans-serif' }, children: [_jsx("h2", { children: "Input-Assist Demo" }), _jsx("div", { children: "Input 1:" }), _jsx(InputEditor, {}), _jsx("div", { children: "Input 2:" }), _jsx(InputEditor, {}), _jsx(InputAssistModal, {})] }) }));
createRoot(document.getElementById('root')).render(_jsx(App, {}));
