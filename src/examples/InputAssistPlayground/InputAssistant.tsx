import { useInputAssist } from '../../lib/tools/InputAssist'
import LauncherButton from './LauncherButton'

export default function InputAssistModal() {
  const assist = useInputAssist()

  if (assist.state !== 'active') {
    return <LauncherButton status={assist.state} onActivate={() => assist.activate()} />
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 600,
        background: '#fff',
        padding: 24,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        zIndex: 1000
      }}
    >
      <div style={{ fontWeight: 600 }}>{assist.context?.metadata?.title as string ?? 'Assist'}</div>

      <textarea
        style={{ width: '100%', height: 100, padding: 8, border: '1px solid #ddd' }}
        readOnly
        value={assist.originalText}
      />
      <textarea
        style={{ width: '100%', height: 100, padding: 8, border: '1px solid #ddd', background: '#eef' }}
        readOnly
        value={assist.refinedText}
      />

      <input
        style={{ flex: 1, padding: 8, border: '1px solid #ddd' }}
        value={assist.prompt}
        onChange={e => assist.setPrompt(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && assist.refine()}
        placeholder="Type instruction…"
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={assist.cancel}>Cancel</button>
        <button disabled={!assist.refinedText} onClick={assist.accept}>
          Accept
        </button>
      </div>
    </div>
  )
}
