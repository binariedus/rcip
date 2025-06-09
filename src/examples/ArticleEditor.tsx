import { useState, ChangeEvent } from 'react'
import { useActionRegistration } from '@lib/hooks/useActionRegistration'
import { IdScope } from '@lib/context/IdScopeContext'
import type { ActionDefinition } from '@lib/core/types'

export function ArticleEditor() {
  const [content, setContent] = useState('Edit me…')
  const node = 'Editor'

  const updateDef: ActionDefinition<string> = {
    type: 'logic',
    label: 'Update Content',
    description: 'Replace full article text',
    handler: v => setContent(v)
  }

  const infoDef: ActionDefinition<void, { content: string; length: number }> = {
    type: 'logic',
    label: 'Get Info',
    description: 'Return article text and length',
    handler: () => ({ content, length: content.length })
  }

  useActionRegistration(node, 'updateContent', updateDef)
  useActionRegistration(node, 'getInfo', infoDef)

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
  }

  return (
    <IdScope id="Editor" label="Article Editor" description="Textarea editor">
      <div className="p-4 space-y-4">
        <textarea
          className="w-full h-64 p-3 border rounded"
          value={content}
          onChange={onChange}
        />
        <pre className="p-3 bg-gray-100 rounded whitespace-pre-wrap">{content}</pre>
      </div>
    </IdScope>
  )
}
