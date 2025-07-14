import { createRoot } from 'react-dom/client'
import { RcipProvider } from '../../lib'
import { InputAssistProvider } from '../../lib/tools/InputAssist'
import InputAssistModal from './InputAssistant'
import InputEditor from './InputEditor'

const App = () => (
  <RcipProvider>
    <InputAssistProvider refine={(orig, prompt) => `✨ ${prompt}: ${orig}`}>
      <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
        <h2>Input-Assist Demo</h2>

        <div>Input 1:</div>
        <InputEditor />

        <div>Input 2:</div>
        <InputEditor />

        <InputAssistModal />
      </div>
    </InputAssistProvider>
  </RcipProvider>
)

createRoot(document.getElementById('root')!).render(<App />)
