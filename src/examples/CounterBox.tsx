import { useState } from 'react'
import { useActions } from '@lib/hooks/useActions'
import type {CounterMap} from "@lib/core/types";

export function CounterBox() {
  const [count, setCount] = useState(0)

  useActions<CounterMap, 'CounterBox'>('CounterBox', {
    incrementBy: {
      type: 'logic',
      label: 'Increment',
      handler: n => setCount(c => c + n)
    }
  })

  return (
    <>
      <div>Count: {count}</div>
    </>
  )

  // return <div>Count: {count}</div>
}
