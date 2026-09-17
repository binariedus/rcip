---
title: Add typed capabilities to a React app
description: Install RCIP and expose your first React action to assistants with JSON Schema, live bindings, application policy, and a narrow client.
---
# Add your first capability

Install `@binaried/rcip`, then declare the contract outside a component. This example
exposes a small read operation so you can verify integration without a provider or backend.

```tsx
import { useState } from 'react'
import {
  RCIP_PROTOCOL_VERSION, createRcipRuntime,
  defineRcipApplication, defineRcipCapability,
} from '@binaried/rcip/core'
import { RcipProvider, useRcipCapability, useRcipClient } from '@binaried/rcip/react'

const readCount = defineRcipCapability<Record<string, never>, { count: number }>({
  id: 'counter.read', title: 'Read the count',
  description: 'Return the current counter value.', scopeIds: [], effect: 'read',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  outputSchema: {
    type: 'object', properties: { count: { type: 'number' } },
    required: ['count'], additionalProperties: false,
  },
})
const definition = defineRcipApplication({
  protocolVersion: RCIP_PROTOCOL_VERSION,
  application: { id: 'example.counter', name: 'Counter', description: 'First RCIP integration.' },
  scopes: [], capabilities: [readCount],
})

function Counter() {
  const [count, setCount] = useState(0)
  const [result, setResult] = useState('')
  const client = useRcipClient()
  useRcipCapability(readCount, { execute: () => ({ count }), revision: count })
  return <>
    <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    <button onClick={async () => setResult(JSON.stringify(await client.invoke({
      capabilityId: readCount.id, input: {},
    })))}>Read through RCIP</button>
    <output>{result}</output>
  </>
}
export default function App() {
  const [runtime] = useState(() => createRcipRuntime(definition))
  return <RcipProvider runtime={runtime}><Counter /></RcipProvider>
}
```

The two buttons access the same state. A consumer receives `runtime.client`, which
can discover and invoke capabilities but cannot install handlers or approve confirmation.

## Add writes deliberately

Set the capability's effect to `write`, give it explicit input/output schemas, and
bind your existing action. Configure host policy; the default denies `write` and
`external` operations, allows reads, and requests confirmation for destructive operations.
A custom policy can return `allow`, `deny`, or `confirm` based on application rules.

When invocation returns `confirmation_required`, present the operation in trusted
application UI and resolve its ID with `runtime.host.resolveConfirmation(id, approved)`.
The [packaged Assist](./assist-and-input-pipelines) already supplies this host UI when
mounted by your application. Backend authorization and domain validation still apply.

## Next steps

- <a href="/rcip/demo/" target="_self">Run the interactive demo</a> without an account or API key.
- [Build a consumer-defined tool](./tool-author-guide).
- [Understand binding lifecycle and cancellation](./lifecycle).
- [Browse the API reference](./api).
