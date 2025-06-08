import { useState, ChangeEvent } from 'react'
import { useIdScope } from '@lib/hooks/useIdScope'
import { useUIAction } from '@lib/context/UIActionProvider'
import { useActionRegistration } from '@lib/hooks/useActionRegistration'
import type { ActionDefinition } from '@lib/core/types'
import type { AppMap } from './types'

export function MainInput() {
  const [value, setValue] = useState('')
  const ui = useUIAction<AppMap>()
  const nodeId = useIdScope('MainInput')

  const updateDef: ActionDefinition<string> = {
    type: 'logic',
    label: 'Update Value',
    handler: v => setValue(v)
  }

  const getInfoDef: ActionDefinition<void, { value: string }> = {
    type: 'logic',
    label: 'Get Current Info',
    handler: () => ({ value })
  }

  useActionRegistration(nodeId, 'updateValue', updateDef)
  useActionRegistration(nodeId, 'getInfo', getInfoDef)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    ui.invoke('DevTrigger', 'syncValue', v)
  }

  return (
    <div style={{ padding: 16 }}>
      <input
        style={{ padding: 8, fontSize: 16, width: '100%' }}
        value={value}
        onChange={handleChange}
      />
      <div style={{ marginTop: 12, fontSize: 18 }}>Current: {value}</div>
    </div>
  )
}
