import React, {useEffect} from "react";

type Props = {
  status: 'idle' | 'ready' | 'active'
  onActivate: () => void
}

export default function LauncherButton({ status, onActivate }: Props) {

  const [enabled, setEnabled] = React.useState(false)

  useEffect(() => {
    setEnabled(status === 'ready')
  }, [status])

  return (
    <button
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        border: 'none',
        background: status === 'idle' ? '#9ca3af' : '#2563eb',
        color: '#fff',
        fontSize: 22,
        cursor: enabled ? 'pointer' : 'default'
      }}
      disabled={!enabled}
      tabIndex={enabled ? 0 : -1}
      onClick={enabled ? onActivate : undefined}
      title="Refine text"
    >
      ✎
    </button>
  )
}
