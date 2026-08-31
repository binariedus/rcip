import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@binaried/rcip/explorer/styles.css'

import { App } from './App'
import './styles.css'
import '@binaried/rcip/assist/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('RCIP pilot root element is missing.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
