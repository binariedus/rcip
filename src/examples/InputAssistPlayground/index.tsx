import { createRoot } from 'react-dom/client'
import { RcipProvider } from '../../lib'

import InputAssistModal from "./InputAssistant";
import InputEditor from "./InputEditor";

const App = () => (

  <RcipProvider>
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h2>Input-Assist Demo</h2>

      <div>
        Input 1:
      </div>
      <InputEditor />

      <div>
        Input 2:
      </div>

      <InputEditor />

      <InputAssistModal></InputAssistModal>

    </div>
  </RcipProvider>

)

createRoot(document.getElementById('root')!).render(<App />)
