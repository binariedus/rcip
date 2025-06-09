import { useState } from 'react'
import { useUIAction } from '@lib/context/UIActionProvider'
import { IdScope } from '@lib/context/IdScopeContext'

async function callChat(apiKey: string, prompt: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: prompt
    })
  })
  const data = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

export function AssistantPanel() {
  const ui = useUIAction()
  const [visible, setVisible] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  async function runCommand() {
    if (!input.trim()) return
    setBusy(true)
    const info = await ui.invoke('Editor', 'getInfo', undefined)
    const messages = [
      { role: 'system', content: 'You are a senior technical editor.' },
      { role: 'user', content: `Current article:\n"""${info.content}"""` },
      { role: 'user', content: `Instruction:\n${input}` }
    ]
    const suggestion = await callChat(apiKey, messages as any)
    await ui.invoke('Editor', 'updateContent', suggestion)
    setInput('')
    setBusy(false)
  }

  return (
    <IdScope id="Assistant" label="AI Assistant" description="GPT helper panel">
      <>
        <button
          className="fixed right-4 bottom-4 p-4 bg-blue-600 text-white rounded-full"
          onClick={() => setVisible(v => !v)}
        >
          🛠
        </button>

        {visible && (
          <footer className="fixed bottom-0 left-0 w-full bg-white border-t p-4 space-y-3">
            {apiKey ? (
              <>
                <textarea
                  className="w-full h-24 p-2 border rounded"
                  placeholder="/refine improve intro section"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded"
                    onClick={runCommand}
                    disabled={busy}
                  >
                    {busy ? 'Working…' : 'Submit'}
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-300 rounded"
                    onClick={() => setVisible(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  className="w-full p-2 border rounded"
                  placeholder="OpenAI API key"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={() => apiKey && setVisible(true)}
                    disabled={!apiKey}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </footer>
        )}
      </>
    </IdScope>
  )
}
