import { useState } from 'react'
import { useActionRegistration } from '@lib/hooks/useActionRegistration'
import { useIdScope } from '@lib/hooks/useIdScope'
import type { ActionDefinition } from '@lib/core/types'

type CounterMap = {
  CounterBox: {
    incrementBy: { P: number; R: void }
  }
}

export function CounterBox() {
  const [count, setCount] = useState(0)

  const scopedId = useIdScope('CounterBox')

  const definition: ActionDefinition<number, void> = {
    type: 'logic',
    label: 'Increment',
    handler: n => setCount(c => c + n)
  }

  useActionRegistration<CounterMap['CounterBox']['incrementBy']['P'], CounterMap['CounterBox']['incrementBy']['R']>(
    scopedId,
    'incrementBy',
    definition
  )

  return <div>Count: {count}</div>
}
