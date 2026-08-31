# RCIP

**React Component Interface Protocol**

RCIP is a small semantic control plane for React applications. An application
declares stable product capabilities, binds them to its existing behavior, and
gives consumer-defined tools a narrow client for discovery and invocation.

RCIP does not expose the DOM or React component tree. It does not include an AI
provider, model credentials, automation service, or plugin marketplace. Human
UI and semantic tools remain parallel interfaces over the same application
code. An optional provider-neutral Assist dot and floating panel are included;
the consuming application supplies the decision callback.

## Install

```bash
npm install @binaried/rcip@beta
```

RCIP 2 is currently available through the `beta` distribution tag. It
implements protocol `1.0` and supports React 18 and React 19.

## Package surfaces

- `@binaried/rcip/core`: framework-neutral definitions, runtime, and types.
- `@binaried/rcip/react`: React provider and host binding hooks.
- `@binaried/rcip/explorer`: optional read-only capability registry UI.
- `@binaried/rcip/assist`: optional Assist hook, dot, and floating panel.
- `@binaried/rcip`: convenient combined core and React exports.

## Define an application contract

```tsx
import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipApplication,
  defineRcipCapability,
  defineRcipScope,
} from '@binaried/rcip/core'

const todos = defineRcipScope({
  id: 'todos',
  title: 'Todos',
  description: 'The user task area.',
})

const createTodo = defineRcipCapability<
  { title: string },
  { id: string; title: string }
>({
  id: 'todos.create',
  title: 'Create todo',
  description: 'Create one task.',
  usage: {
    whenToUse: 'Use when the user explicitly asks to add one task.',
    examples: [
      { description: 'Add a grocery task.', input: { title: 'Buy milk' } },
    ],
  },
  scopeIds: [todos.id],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: { title: { type: 'string', minLength: 1 } },
    required: ['title'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
    },
    required: ['id', 'title'],
    additionalProperties: false,
  },
})

const definition = defineRcipApplication({
  protocolVersion: RCIP_PROTOCOL_VERSION,
  application: {
    id: 'example.todos',
    name: 'Todos',
    description: 'Example task application.',
  },
  scopes: [todos],
  capabilities: [createTodo],
})

export const runtime = createRcipRuntime(definition, {
  policy({ capability, confirmed }) {
    if (capability.effect === 'read' || confirmed) {
      return { decision: 'allow' }
    }
    return { decision: 'confirm' }
  },
})
```

## Bind existing React behavior

```tsx
import {
  RcipProvider,
  useRcipCapability,
  useRcipContext,
} from '@binaried/rcip/react'

function TodoFeature() {
  useRcipContext({
    activeScopeIds: ['todos'],
    primaryScopeId: 'todos',
  })

  useRcipCapability(createTodo, {
    execute: ({ title }) => saveTodo(title),
    getAvailability: () => ({
      available: userCanCreateTodo(),
    }),
  })

  return <TodoScreen />
}

export function App() {
  return (
    <RcipProvider runtime={runtime}>
      <TodoFeature />
    </RcipProvider>
  )
}
```

Definitions describe a stable contract. Bindings connect that contract to live
application state. The runtime validates availability, input, host policy,
confirmation, execution, and output before returning a structured outcome.

## Build a consumer-defined tool

A tool receives `RcipClient`, never the host controller.

```ts
import type { RcipClient } from '@binaried/rcip/core'

export async function listAvailableActions(client: RcipClient) {
  return client.listCapabilities({
    context: 'current',
    availableOnly: true,
  })
}

export async function invokeCreateTodo(
  client: RcipClient,
  title: string,
) {
  return client.invoke({
    capabilityId: 'todos.create',
    input: { title },
  })
}
```

Tools own their model/provider integration and API transport. Only trusted
application code calls `runtime.host.resolveConfirmation`.

## Optional Assist tool

The SDK ships a provider-neutral Assist tool that collapses to a status dot and
expands into a draggable floating panel. The host passes its runtime and a
consumer-owned asynchronous callback. RCIP supplies the current snapshot,
conversation, and prior outcomes; the callback returns either a message or one
bounded batch of capability invocations.

```tsx
import { RcipAssist, type RcipAssistDecide } from '@binaried/rcip/assist'
import '@binaried/rcip/assist/styles.css'

const decide: RcipAssistDecide = async (request, { signal }) => {
  const response = await fetch('/api/assist', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  })
  return response.json()
}

<RcipAssist
  runtime={runtime}
  decide={decide}
  mode="interactive"
  examplePrompts={['Add "Buy milk" to my todos']}
/>
```

Use `mode="read-only"` when the callback may discover and invoke only read
capabilities. Interactive mode still goes through runtime availability, schema,
host policy, and trusted host confirmation. The headless `useRcipAssist` hook is
available for consumers that want a different UI.

## Optional capability explorer

The package ships one generic tool: a live, read-only registry dashboard.

```tsx
import { RcipCapabilityExplorer } from '@binaried/rcip/explorer'
import '@binaried/rcip/explorer/styles.css'

<RcipCapabilityExplorer client={runtime.client} />
```

It displays every registered capability and highlights capabilities relevant to
the current semantic context. It never invokes capabilities or observes tool
execution state. CSS custom properties prefixed with `--rcip-explorer-` support
consumer theming.

## Run the reference pilot

```bash
npm ci
RCIP_PILOT_PORT=4176 npm run dev
```

The standalone pilot contains a normal Todos/Profile UI, a consumer-owned
Control Panel, the packaged Assist and Explorer tools, and a server-side
optional model adapter with deterministic fallback. It does not require any
HiNivaas service.

Validation commands:

```bash
npm run check
npm run test:e2e
npm audit
```

## Documentation

- [Protocol 1.0](docs/protocol.md)
- [Security model](docs/security.md)
- [Tool author guide](docs/tool-author-guide.md)
- [Migrating from v1](docs/migration-v1-to-v2.md)
- [Release runbook](docs/releasing.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

Apache-2.0
