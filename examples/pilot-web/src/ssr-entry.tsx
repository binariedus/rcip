import { renderToString } from 'react-dom/server'
import { createFixtureRuntime, LifecycleFixture } from './LifecycleFixture'
export function render(name: string) {
  return renderToString(
    <LifecycleFixture runtime={createFixtureRuntime(name)} />,
  )
}
