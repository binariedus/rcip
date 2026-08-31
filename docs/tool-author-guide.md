# Authoring RCIP consumer tools

An RCIP tool is consumer-owned code that receives `RcipClient`. Protocol 1.0
does not require a manifest, registry, framework, provider, or UI shape.

## Discover

```ts
import type { RcipClient } from '@binaried/rcip/core'

export function currentCapabilities(client: RcipClient) {
  return client.listCapabilities({
    context: 'current',
    availableOnly: true,
  })
}
```

Subscribe when the tool must react to context, binding, or availability changes:

```ts
const unsubscribe = client.subscribe(() => {
  const snapshot = client.getSnapshot()
  renderTool(snapshot)
})
```

Call `unsubscribe()` when the tool unmounts.

## Invoke

```ts
const outcome = await client.invoke({
  capabilityId: 'polls.create',
  input: {
    question: 'Where should we meet?',
    options: ['Clubhouse', 'Garden'],
  },
})
```

Treat every outcome as data:

- `succeeded`: consume the validated output;
- `confirmation_required`: hand the request to trusted host UI;
- `failed`: display or map the stable error code;
- `denied`: respect host policy and do not retry automatically.

Never invent identifiers, bypass unavailable capabilities, or assume an
operation is idempotent.

## Own tool state

The tool normally owns its model/provider adapter, API transport, retries, and
result presentation. RCIP does not prescribe a provider or network boundary.

A floating assistant dot, narrator, translator, command palette, or background
coordinator can all use the same client while presenting completely different
experiences.

## Start with the packaged Assist

`@binaried/rcip/assist` provides a reusable orchestration hook and optional dot
plus floating panel. Pass `runtime`, a `decide` callback, and an explicit mode.
The callback receives the application snapshot and returns a message or a
bounded action batch; it can call any provider or deterministic service chosen
by the consumer.

Keep provider calls server-side when they require credentials. Treat callback
responses as untrusted: Assist bounds their shape and batch size, while the
runtime remains authoritative for capability existence, schema, availability,
policy, confirmation, and output. Use `useRcipAssist` when a translator,
narrator, or custom surface needs the orchestration without the packaged UI.

## Preserve the boundary

Pass only `RcipClient` into tool code. Keep `runtime.host`, authorization,
bindings, semantic context, and confirmation resolution in trusted application
code. Do not embed model credentials in browser bundles or capability metadata.

## Test through the public surface

Verify tools against a packed RCIP package and real host bindings. Browser tests
should cover discovery changes, successful outcomes, confirmation, denial,
invalid input, unavailable capabilities, and tool behavior when the host
unmounts a binding.
