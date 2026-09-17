import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { createFixtureRuntime, LifecycleFixture } from './LifecycleFixture'
const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root.')
hydrateRoot(
  root,
  <StrictMode>
    <LifecycleFixture
      runtime={createFixtureRuntime(root.dataset.requestName)}
    />
  </StrictMode>,
)
