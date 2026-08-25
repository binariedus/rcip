# RCIP

**React Component Interface Protocol**

RCIP is a small semantic control plane for React applications. An application
declares stable product capabilities, binds them to its existing behavior, and
gives consumer-defined tools a narrow client for discovery and invocation.

RCIP does not expose the DOM or React component tree. It does not include an AI
provider, chat interface, automation engine, or plugin marketplace. Human UI
and semantic tools remain parallel interfaces over the same application code.

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

Tools own their model/provider integration, UI, progress state, and presentation
of confirmation requests. Only trusted application code calls
`runtime.host.resolveConfirmation`.

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
RCIP_PILOT_PORT=4173 npm run dev
```

The pilot contains a normal Todos/Profile UI, a consumer-owned Control Panel,
an optional model adapter with deterministic fallback, and the packaged
capability explorer.

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
