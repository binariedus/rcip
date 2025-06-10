import { useState, useEffect, ChangeEvent } from 'react'
import { Box, TextField } from '@mui/material'
import { useUiActions } from '@lib/hooks/useUiActions'
import type { ActionDefinition } from '@lib/core/types'
import {IdScope} from "@lib/context/IdScopeContext";

export function ArticleEditor() {
  const [content, setContent] = useState('Start writing your article here…')
  const add = useUiActions('Editor')

  const updateDef: ActionDefinition<string> = {
    type: 'logic',
    label: 'Update Article',
    description: 'Replace the full article text with new content',
    handler: v => setContent(v)
  }

  const infoDef: ActionDefinition<void, { content: string; length: number }> = {
    type: 'logic',
    label: 'Get Article Info',
    description: 'Retrieve current article text and its length',
    handler: () => ({ content, length: content.length })
  }

  useEffect(() => {
    add('updateContent', updateDef)
    add('getInfo', infoDef)
  }, [add])

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
  }

  return (

    <IdScope
      id="Editor"
      label="Article Editor"
      description="Rich text editor for writing and previewing articles"
    >
      <Box p={2} maxWidth="800px" mx="auto" mt={4}>
        <TextField
          label="Article Content"
          variant="outlined"
          multiline
          rows={12}
          fullWidth
          value={content}
          onChange={onChange}
        />

        {/*<Box mt={3}>
          <Typography variant="h6">Live Preview</Typography>
          <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-wrap' }}>
            {content}
          </Paper>
        </Box>*/}
      </Box>
    </IdScope>
  )
}
