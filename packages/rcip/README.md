# @binaried/rcip

React Component Interface Protocol: a semantic capability control plane for
React applications.

```bash
npm install @binaried/rcip@beta
```

RCIP 2 is currently published through the `beta` distribution tag so the
existing stable major remains unchanged during evaluation.

## Exports

- `@binaried/rcip/core`: definitions, runtime, protocol types, and
  `RcipClient`.
- `@binaried/rcip/react`: `RcipProvider`, `useRcipContext`,
  `useRcipCapability`, `useRcipClient`, and `useRcipSnapshot`.
- `@binaried/rcip/explorer`: the optional read-only
  `RcipCapabilityExplorer`.
- `@binaried/rcip/explorer/styles.css`: explorer default styles.
- `@binaried/rcip/assist`: provider-neutral `RcipAssist`,
  `useRcipAssist`, and callback contracts.
- `@binaried/rcip/assist/styles.css`: Assist default styles.
- `@binaried/rcip`: combined core and React exports.

## Minimal integration

```tsx
import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipApplication,
} from '@binaried/rcip/core'
import { RcipProvider } from '@binaried/rcip/react'

const runtime = createRcipRuntime(
  defineRcipApplication({
    protocolVersion: RCIP_PROTOCOL_VERSION,
    application: {
      id: 'example.application',
      name: 'Example',
      description: 'An RCIP-enabled application.',
    },
    scopes: [],
    capabilities: [],
  }),
)

<RcipProvider runtime={runtime}>{children}</RcipProvider>
```

Product code declares scopes and capabilities, then binds existing behavior with
`useRcipCapability`. Consumer-defined tools receive only
`runtime.client`. The host retains binding, context, policy, and confirmation
control.

## Capability explorer

```tsx
import { RcipCapabilityExplorer } from '@binaried/rcip/explorer'
import '@binaried/rcip/explorer/styles.css'

<RcipCapabilityExplorer client={runtime.client} />
```

The explorer displays all registered capabilities and highlights those relevant
to the current semantic context. It is read-only and cannot invoke application
behavior.

## Assist

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

<RcipAssist runtime={runtime} decide={decide} mode="read-only" />
```

Assist is a collapsed status dot and draggable floating conversation panel. It
ships no AI provider, network transport, credentials, or application-specific
logic. The callback may return text or one bounded action batch. Every action
still passes through RCIP validation, host policy, and host-owned confirmation.
Use `mode="interactive"` only when the host wants to expose state-changing
capabilities.

Full documentation, protocol guarantees, security guidance, and the v1
migration guide are available at
[github.com/binariedus/rcip](https://github.com/binariedus/rcip).

Licensed under Apache-2.0.
