import { useState } from 'react'
import {
  Drawer,
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  CircularProgress
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import { useUIAction } from '@lib/context/UIActionProvider'
import {IdScope} from "@lib/context/IdScopeContext";

async function callChat(apiKey: string, messages: any[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: 'gpt-4o', messages })
  })
  const { choices } = await res.json()
  return choices?.[0]?.message?.content ?? ''
}

export function AssistantPanel() {
  const ui = useUIAction()
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!command.trim()) return
    setLoading(true)
    const isRefine = command.startsWith('/refine ')
    const isDescribe = command.startsWith('/describe ')

    const info = await ui.invoke<void, { content: string; length: number }>(
      'Editor',
      'getInfo',
      undefined
    )

    let messages: any[] = [
      { role: 'system', content: 'You are an expert technical editor.' },
      { role: 'user', content: `Article (${info.length} chars):\n${info.content}` }
    ]

    if (isRefine) {
      const instruction = command.replace('/refine ', '')
      messages.push({ role: 'user', content: `Please refine: ${instruction}` })
    } else if (isDescribe) {
      const topic = command.replace('/describe ', '')
      const registry = ui.describe()
      messages.push({
        role: 'user',
        content: `Describe the component tree and capabilities about: ${topic}\n\nRegistry:\n${JSON.stringify(
          registry,
          null,
          2
        )}`
      })
    } else {
      messages.push({
        role: 'user',
        content:
          'Please enter a command starting with /refine or /describe, e.g. "/refine improve tone".'
      })
    }

    console.log(apiKey, messages)

    const result = await callChat(apiKey, messages)
    setResponse(result)

    if (isRefine) {
      await ui.invoke<string, void>('Editor', 'updateContent', result)
      setOpen(false)
    }

    setLoading(false)
  }

  return (

    <IdScope
      id="Assistant"
      label="AI Editorial Assistant"
      description="Use this panel to refine or describe your article via GPT"
    >
      <IconButton
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16, bgcolor: 'white' }}
        onClick={() => setOpen(true)}
      >
        <SendIcon />
      </IconButton>

      <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)}>
        <Box p={2} display="flex" flexDirection="column" gap={2}>
          {!apiKey ? (
            <>
              <TextField
                label="OpenAI API Key"
                type="password"
                fullWidth
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={() => apiKey && setOpen(true)}
                disabled={!apiKey}
              >
                Save & Continue
              </Button>
            </>
          ) : (
            <>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1">Enter Command</Typography>
                <IconButton onClick={() => setOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <TextField
                multiline
                rows={3}
                placeholder="e.g. /refine improve introduction"
                fullWidth
                value={command}
                onChange={e => setCommand(e.target.value)}
              />

              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  disabled={loading}
                >
                  Submit
                </Button>
                {!command.startsWith('/refine') && !command.startsWith('/describe') && (
                  <Button variant="outlined" onClick={() => setResponse(null)}>
                    Help
                  </Button>
                )}
              </Box>

              {response && (
                <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                  <Typography variant="body1" component="pre">
                    {response}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Drawer>
    </IdScope>
  )
}
