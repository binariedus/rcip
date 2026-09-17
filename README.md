# RCIP

**React Capability Interface Protocol**

RCIP lets React applications expose typed capabilities to AI assistants and other
tools without DOM scraping. Your application controls contextual discovery,
input/output validation, availability, policy, confirmation, and execution.
The core is framework-neutral; React bindings connect contracts to live behavior.

[![npm](https://img.shields.io/npm/v/@binaried/rcip)](https://www.npmjs.com/package/@binaried/rcip)
[![CI](https://github.com/binariedus/rcip/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/binariedus/rcip/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](https://www.apache.org/licenses/LICENSE-2.0)

**[Documentation](https://binariedus.github.io/rcip/) ·
[Quick start](https://binariedus.github.io/rcip/quick-start.html) ·
[Interactive demo](https://binariedus.github.io/rcip/demo/) ·
[API reference](https://binariedus.github.io/rcip/api.html) ·
[Source](https://github.com/binariedus/rcip)**

Optional Assist and Explorer provide a ready-made conversation UI and read-only
capability inspector. No model service, credentials, or remote transport is bundled.
The hosted demo uses a clearly labeled deterministic adapter and needs no account.

## Why RCIP

React already gives people a visual interface, but external tools usually have
to scrape labels, inspect DOM structure, or depend on application-specific API
knowledge. RCIP lets the application publish the meaning it is willing to
expose while keeping execution inside trusted product code.

```text
                           live semantic snapshot
                       scopes + context + capabilities
                                    │
                                    ▼
  assist / translator / tool ─► RcipClient
                                    │
                                    ▼
                schema → availability → policy → confirmation
                                    │
                                    ▼
                         existing React binding
                                    │
                                    ▼
                         validated application outcome
```

The integration has four deliberate steps: declare stable product intent, bind
existing behavior, let tools discover the live surface, and invoke only through
the validated client boundary.

## Install

```bash
npm install @binaried/rcip
```

RCIP 2 implements protocol `1.0` and supports React 18 and React 19.

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
/>
```

Use `mode="read-only"` when the callback may discover and invoke only read
capabilities. Interactive mode still goes through runtime availability, schema,
host policy, and trusted host confirmation. The headless `useRcipAssist` hook is
available for consumers that want a different UI.

The polished default interaction keeps Assist small without making it mouse
only: click/tap starts or stops voice input, double-click opens the panel,
long-press opens it on touch, Enter opens it from a keyboard, and Space toggles
voice input. The built-in voice source is intentionally a one-second simulation
that captures nothing and invokes nothing.

### Input pipelines

Applications can replace the simulation with a consumer-owned voice adapter and
ordered processors. This makes audio → transcription → text refinement → Assist
an explicit, cancellable pipeline rather than model-specific SDK behavior.

```tsx
import type { RcipAssistInputPipeline } from '@binaried/rcip/assist'

const inputPipeline: RcipAssistInputPipeline = {
  voice: browserVoiceAdapter,
  processors: [transcribeOnYourServer, refineOnYourServer],
}

<RcipAssist {...props} inputPipeline={inputPipeline} />
```

Composer text uses the same processor chain. A final text value is submitted to
the existing decision flow; `null` consumes the input, and an untransformed
audio value fails safely. See
[Assist and input pipelines](https://binariedus.github.io/rcip/assist-and-input-pipelines.html).

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

- [Protocol 1.0](https://binariedus.github.io/rcip/protocol.html)
- [Security model](https://binariedus.github.io/rcip/security.html)
- [Tool author guide](https://binariedus.github.io/rcip/tool-author-guide.html)
- [Assist and input pipelines](https://binariedus.github.io/rcip/assist-and-input-pipelines.html)
- [Migrating from v1](https://binariedus.github.io/rcip/migration-v1-to-v2.html)
- [Release runbook](https://binariedus.github.io/rcip/releasing.html)
- [Contributing](https://github.com/binariedus/rcip/blob/main/CONTRIBUTING.md)
- [Security reporting](https://github.com/binariedus/rcip/blob/main/SECURITY.md)
- [Changelog](https://binariedus.github.io/rcip/changelog.html)

## License

Apache-2.0
