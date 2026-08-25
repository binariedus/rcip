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

The tool owns its model/provider adapter, progress state, retries, conversation
or non-conversation UI, and result presentation. RCIP does not prescribe those
concerns.

A floating assistant dot, narrator, translator, command palette, or background
coordinator can all use the same client while presenting completely different
experiences.

## Preserve the boundary

Pass only `RcipClient` into tool code. Keep `runtime.host`, authorization,
bindings, semantic context, and confirmation resolution in trusted application
code. Do not embed model credentials in browser bundles or capability metadata.

## Test through the public surface

Verify tools against a packed RCIP package and real host bindings. Browser tests
should cover discovery changes, successful outcomes, confirmation, denial,
invalid input, unavailable capabilities, and tool behavior when the host
unmounts a binding.
