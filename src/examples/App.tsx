import { UIActionProvider } from '@lib/context/UIActionProvider'
import { CounterBox } from './CounterBox'
import { DevTrigger } from './DevTrigger'
import type { Middleware } from '@lib/core/types'

const logger: Middleware = async (ctx, next) => {
  console.info('before', ctx)
  const result = await next()
  console.info('after', ctx)
  return result
}

export function App() {
  return (
    <UIActionProvider middleware={[logger]}>
      <CounterBox />
      <DevTrigger />
    </UIActionProvider>
  )
}
