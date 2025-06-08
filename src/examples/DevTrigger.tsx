import { useUIAction } from '@lib/context/UIActionProvider'

export function DevTrigger() {
  const ui = useUIAction()
  return <button onClick={() => ui.invoke('CounterBox', 'incrementBy', 5)}>external +5</button>
}
