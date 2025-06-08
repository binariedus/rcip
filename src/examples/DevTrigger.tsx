import { useState, useEffect } from 'react'
import { useActionRegistration } from '@lib/hooks/useActionRegistration'
import { useIdScope } from '@lib/hooks/useIdScope'
import { useUIAction } from '@lib/context/UIActionProvider'
import type { ActionDefinition } from '@lib/core/types'
import type { AppMap } from './types'

export function DevTrigger() {
  const [visible, setVisible] = useState(false)
  const [draft, setDraft] = useState('')
  const ui = useUIAction<AppMap>()
  const nodeId = useIdScope('DevTrigger')

  const syncDef: ActionDefinition<string> = {
    type: 'logic',
    label: 'Sync Value',
    handler: v => setDraft(v)
  }

  useActionRegistration(nodeId, 'syncValue', syncDef)

  useEffect(() => {
    if (visible) {
      ui.invoke('MainInput', 'getInfo', undefined).then(info =>
        setDraft(info.value)
      )
    }
  }, [visible, ui])

  return (
    <>
      <button
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          padding: 12,
          borderRadius: '50%',
          fontSize: 20
        }}
        onClick={() => setVisible(v => !v)}
      >
        🛠
      </button>

      {visible && (
        <footer
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            background: '#f5f5f5',
            padding: 16,
            boxShadow: '0 -2px 4px rgba(0,0,0,.1)'
          }}
        >
          <input
            style={{ padding: 8, fontSize: 16, width: '70%' }}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button
            style={{ marginLeft: 12, padding: '8px 16px', fontSize: 16 }}
            onClick={() => ui.invoke('MainInput', 'updateValue', draft)}
          >
            Submit
          </button>
        </footer>
      )}
    </>
  )
}
