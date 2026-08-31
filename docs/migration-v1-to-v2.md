# Migrating from RCIP v1 to v2

RCIP 2 is a replacement, not a source-compatible upgrade. Version 1 described
mounted React components and imperative actions. Version 2 declares stable
product capabilities and binds them to live application behavior.

| Version 1 | Version 2 |
| --- | --- |
| component record | semantic scope |
| component action | capability definition |
| action name lookup | stable capability identifier |
| free-form payload/result | strict JSON input/output schemas |
| registry trigger | validated `RcipClient.invoke` |
| provider-owned registry | framework-neutral runtime plus React adapter |
| caller-controlled execution | host policy and confirmation |

## Migration sequence

1. Inventory what users accomplish, not every component method.
2. Group operations into stable semantic scopes.
3. Define narrow JSON schemas and classify effects.
4. Create one runtime at the application boundary.
5. Bind definitions next to the feature state or service that implements them.
6. Publish current semantic context from routing or feature state.
7. Give consumer-defined tools only `runtime.client`.
8. Add host policy, confirmation UI, and browser-level behavior proof before
   enabling state-changing calls.

Do not mechanically expose arbitrary setters, component internals, rendering
details, or low-level click/focus/scroll operations.

## Import changes

Version 2 provides explicit package surfaces:

```ts
import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipCapability,
} from '@binaried/rcip/core'
import {
  RcipProvider,
  useRcipCapability,
  useRcipContext,
} from '@binaried/rcip/react'
```

The v2 client type is `RcipClient`. The unpublished alpha name
`RcipAgentClient` is not part of the stable API.

There is no v1 compatibility shim. Migrate feature by feature and keep normal UI
workflows available throughout the transition.
