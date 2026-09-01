# @binaried/rcip

**React Component Interface Protocol**

RCIP is a semantic control plane for React applications. Your application
declares stable product capabilities, binds them to behavior it already owns,
and gives tools a narrow client for discovery and invocation.

The result is one application with parallel interfaces:

- people continue using the normal UI;
- assistants, command surfaces, translators, narrators, and automation tools
  use explicit product capabilities instead of scraping the DOM;
- the application keeps authority over availability, validation, policy,
  confirmation, execution, and output.

```bash
npm install @binaried/rcip
```

RCIP 2 implements protocol `1.0`, supports React 18 and 19, and includes both
ESM and CommonJS entry points.

## The design in one minute

```text
                           live snapshot
                  scopes + context + capabilities
                                 │
                                 ▼
  consumer tool ────────► RcipClient
                                 │
                                 ▼
                      schema + availability
                                 │
                                 ▼
                       host policy / consent
                                 │
                                 ▼
                     existing React binding ─────► application behavior
                                 │
                                 ▼
                        validated outcome
```

RCIP never exposes the DOM, component instances, router internals, or a
privileged host controller to tools. It ships no model provider, credentials,
or mandatory network service.

## Package surfaces

| Import | Purpose |
| --- | --- |
| `@binaried/rcip/core` | Framework-neutral definitions, runtime, client, and protocol types |
| `@binaried/rcip/react` | React provider, context binding, and capability hooks |
| `@binaried/rcip/assist` | Headless Assist orchestration plus optional dot/chat UI |
| `@binaried/rcip/explorer` | Optional read-only capability registry |
| `@binaried/rcip` | Combined core and React exports |

Default styles are explicit imports:

```ts
import '@binaried/rcip/assist/styles.css'
import '@binaried/rcip/explorer/styles.css'
```

## Five-minute host integration

### 1. Declare product intent

Definitions are stable contracts, not component descriptions.

```tsx
import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipApplication,
  defineRcipCapability,
  defineRcipScope,
} from '@binaried/rcip/core'

const todosScope = defineRcipScope({
  id: 'todos',
  title: 'Todos',
  description: 'The user task area.',
})

export const createTodo = defineRcipCapability<
  { title: string },
  { id: string; title: string }
>({
  id: 'todos.create',
  title: 'Create todo',
  description: 'Create one task for the signed-in user.',
  scopeIds: [todosScope.id],
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
  usage: {
    whenToUse: 'Use only when the user explicitly asks to add one task.',
    examples: [
      { description: 'Add a grocery task.', input: { title: 'Buy milk' } },
    ],
  },
})

const definition = defineRcipApplication({
  protocolVersion: RCIP_PROTOCOL_VERSION,
  application: {
    id: 'example.todos',
    name: 'Todos',
    description: 'A small task application.',
  },
  scopes: [todosScope],
  capabilities: [createTodo],
})
```

### 2. Create the host runtime and policy

```tsx
export const runtime = createRcipRuntime(definition, {
  policy({ capability, confirmed }) {
    if (capability.effect === 'read' || confirmed) {
      return { decision: 'allow' }
    }
    return {
      decision: 'confirm',
      reason: 'State-changing actions require user confirmation.',
    }
  },
})
```

Policy is authoritative even when a tool proposes an action. A tool cannot
turn interactive mode into permission.

### 3. Bind existing React behavior

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
      reason: userCanCreateTodo() ? undefined : 'Todo creation is unavailable.',
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

Bindings mount and unmount with React. They reuse your existing services,
navigation, state, and authorization checks.

### 4. Give a tool the narrow client

```ts
import type { RcipClient } from '@binaried/rcip/core'

export async function createTask(client: RcipClient, title: string) {
  const available = client.listCapabilities({
    context: 'current',
    availableOnly: true,
  })

  if (!available.some((capability) => capability.id === 'todos.create')) {
    return null
  }

  return client.invoke({
    capabilityId: 'todos.create',
    input: { title },
  })
}
```

Every invocation resolves to structured data: `succeeded`,
`confirmation_required`, `failed`, or `denied`.

## Packaged Assist

Assist is an optional provider-neutral tool. It collapses to a stateful dot and
opens into a responsive floating conversation panel. The host supplies the
decision callback; RCIP supplies bounded orchestration, confirmation UI, and
capability invocation.

```tsx
import { RcipAssist, type RcipAssistDecide } from '@binaried/rcip/assist'
import '@binaried/rcip/assist/styles.css'

const decide: RcipAssistDecide = async (request, { signal }) => {
  const response = await fetch('/api/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  return response.json()
}

<RcipAssist
  runtime={runtime}
  decide={decide}
  mode="interactive"
  title="Product Assist"
/>
```

Use `mode="read-only"` when Assist may invoke only read capabilities.
Interactive mode still passes every proposed action through schemas,
availability, host policy, and host-owned confirmation.

### Dot interaction

- click or tap once to start voice input;
- click or tap again to stop and process it;
- double-click to open chat;
- long-press to open chat on touch devices;
- press Enter to open chat or Space to toggle voice input from a keyboard.

The default voice source is a one-second visual simulation. It requests no
permission, captures no audio, produces no text, and invokes no capability.
Set `inputPipeline={{ voice: false }}` when no transcription provider is
configured. A single click or Space then reports that voice is unavailable
without opening chat; double-click, long-press, and Enter still open chat.

## Audio → transcript → refined request

Assist input is an ordered, consumer-owned pipeline. It accepts text from the
composer or audio/text from a voice adapter. A final text result automatically
enters the same bounded Assist decision flow.

```tsx
import type {
  RcipAssistInputPipeline,
  RcipAssistInputProcessor,
  RcipAssistVoiceAdapter,
} from '@binaried/rcip/assist'

const browserVoice: RcipAssistVoiceAdapter = {
  async start({ signal }) {
    await recorder.start({ signal })
  },
  async stop({ signal }) {
    const audio = await recorder.stop({ signal })
    return {
      type: 'audio',
      data: audio,
      mimeType: audio.type || 'audio/webm',
    }
  },
  cancel() {
    recorder.cancel()
  },
}

const transcribe: RcipAssistInputProcessor = {
  id: 'transcribe',
  async process(input, { signal }) {
    if (input.type === 'text') return input
    const text = await sendAudioToYourServer(input.data, { signal })
    return { type: 'text', text }
  },
}

const refine: RcipAssistInputProcessor = {
  id: 'refine',
  async process(input, { signal }) {
    if (input.type === 'audio') return input
    const text = await refineOnYourServer(input.text, { signal })
    return { type: 'text', text }
  },
}

const inputPipeline: RcipAssistInputPipeline = {
  voice: browserVoice,
  processors: [transcribe, refine],
}

<RcipAssist {...props} inputPipeline={inputPipeline} />
```

Processors run exactly in declaration order. Returning `null` intentionally
consumes the input without starting a turn. Returning audio after the final
processor fails safely because Assist requires text before calling `decide`.
Cancellation uses one `AbortSignal` across capture and processing.

Keep transcription/refinement credentials and provider calls on a trusted
server. RCIP does not hide browser-bundled secrets.

## Headless Assist

Use `useRcipAssist` to build a command palette, narrator, embedded assistant,
or completely custom UI. The controller exposes:

- conversation state, decision status, confirmation, cancellation, and clear;
- `send` and `submitInput` for pipeline-aware text/audio input;
- `startVoiceInput`, `stopVoiceInput`, and `cancelInput`;
- input status/error and the live application snapshot.

The packaged UI and headless hook share the same orchestration contract.

## Capability Explorer

The Explorer is a separate read-only developer and support surface:

```tsx
import { RcipCapabilityExplorer } from '@binaried/rcip/explorer'
import '@binaried/rcip/explorer/styles.css'

<RcipCapabilityExplorer client={runtime.client} />
```

It displays registered, bound, available, and context-relevant capabilities.
It never invokes application behavior.

## Styling Assist

The default UI is usable without a design system and responds automatically to
dark color preference. Override CSS variables on `.rcip-assist` or a custom
class:

```css
.my-product-assist {
  --rcip-assist-accent: #0f766e;
  --rcip-assist-accent-strong: #115e59;
  --rcip-assist-accent-soft: #e7f8f5;
  --rcip-assist-background: #ffffff;
  --rcip-assist-text: #17201f;
  --rcip-assist-z-index: 1500;
}
```

Status, input, and open state are also available through
`data-rcip-assist-status`, `data-rcip-assist-input-status`, and
`data-rcip-assist-open`.

## Safety boundary

- Treat tool decisions and pipeline results as untrusted input.
- Keep `runtime.host` inside trusted application code; tools receive only
  `runtime.client`.
- Use schemas for structural validation and host policy for authorization and
  consent.
- Never place credentials, private data, or dynamic authorization results in
  capability metadata.
- Do not automatically retry writes or destructive operations.
- Resolve confirmation only in trusted host UI.

RCIP validates contracts and coordinates control. It does not replace your
application's authentication, authorization, transaction, or audit systems.

## Compatibility and versioning

- Protocol `1.0` describes the capability/runtime wire contract.
- Package `2.x` is the capability-first SDK and is intentionally incompatible
  with the older component/action prototype in package `1.x`.
- Patch releases fix behavior without changing public contracts.
- Minor releases add backward-compatible APIs.
- Incompatible public contract changes require a new major after stable.

Published npm versions remain immutable. Install the stable release from
`latest`, or pin an exact version in applications that require deterministic
dependency updates.

## License

Apache-2.0
