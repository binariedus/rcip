import { UIActionProvider } from '@lib/context/UIActionProvider'
import { MainInput } from './MainInput'
import { DevTrigger } from './DevTrigger'

export function App() {
  return (
    <UIActionProvider>
      <MainInput />
      <DevTrigger />
    </UIActionProvider>
  )
}
