---
title: RCIP API reference
description: Reference for the RCIP runtime, client, host controller, React hooks, Assist, Explorer, and public TypeScript contracts.
---
# API reference

Install `@binaried/rcip`. Use explicit entrypoints when you need only one surface.
The root entrypoint combines core and React; it does not export Assist or Explorer.
All [public type contracts](./api-types) are generated from release source.

## Core — `@binaried/rcip/core`

| Export | Purpose |
| --- | --- |
| `RCIP_PROTOCOL_VERSION` | Literal `"1.0"`; independent of npm package version |
| `defineRcipScope(definition)` | Create a stable scope definition |
| `defineRcipCapability<Input, Output>(definition)` | Create a typed capability with JSON schemas and optional usage guidance |
| `defineRcipApplication(definition)` | Combine application metadata, scopes, and capabilities |
| `createRcipRuntime(definition, options?)` | Create an isolated `{ client, host }` runtime |

`Input` and `Output` extend `RcipJsonValue`. A compatible object type alias is often
convenient. TypeScript types do not replace JSON Schema validation.

Runtime options:

| Option | Default and behavior |
| --- | --- |
| `policy(context)` | Reads allowed; writes/external denied; destructive operations request confirmation; confirmed operations allowed. A custom policy returns `allow`, `deny`, or `confirm`. |
| `confirmationTtlMs` | `120000`; pending-confirmation lifetime in milliseconds |
| `createId(prefix)` | Runtime-generated ID; custom implementations must return unique IDs |
| `onEvent(event)` | Optional redacted lifecycle observer; observer exceptions are isolated |

### Consumer client

| Method | Contract |
| --- | --- |
| `getSnapshot()` | Current immutable `RcipApplicationSnapshot`, cached until refresh |
| `listCapabilities(filter?)` | Filter by `context: 'all' \| 'current'`, `availableOnly`, `scopeId`, or `effect` |
| `subscribe(listener)` | Subscribe to revisions; returns unsubscribe function |
| `invoke({ capabilityId, input, invocationId?, signal? })` | Promise of a structured outcome |

Outcomes are `succeeded` with output, `confirmation_required` with an expiring
confirmation ID, or `failed`/`denied` with a stable error code and safe message.
See [error types](./api-types#rciperrorcode) and [lifecycle semantics](./lifecycle).

### Trusted host controller

| Method | Contract |
| --- | --- |
| `bindCapability(definition, { execute, getAvailability? })` | Install a live handler; return its unbind function |
| `setContext({ activeScopeIds, primaryScopeId? })` | Publish semantic context and refresh discovery |
| `refresh()` | Re-evaluate availability and notify subscribers |
| `resolveConfirmation(id, approved)` | Consume a host decision and return the final or rejected outcome |

Only trusted application code receives the host controller. There is no remote
transport, retry queue, durable audit store, or third-party sandbox in protocol 1.0.

## React — `@binaried/rcip/react`

| Export | Contract |
| --- | --- |
| `RcipProvider` | Props `{ runtime, children }`; keep the runtime stable across renders |
| `useRcipClient()` | Return the nearest provider's narrow client |
| `useRcipSnapshot()` | Subscribe using `useSyncExternalStore` |
| `useRcipContext(context)` | Publish context from one owner; clear on cleanup |
| `useRcipCapability(definition, binding)` | Bind on mount, unbind on cleanup, refresh when optional primitive `revision` changes |

Hooks require the provider. `RcipReactCapabilityBinding` extends the core binding
with `revision?: RcipJsonPrimitive`. Read the [SSR and Strict Mode guidance](./lifecycle).

## Assist — `@binaried/rcip/assist`

Import `@binaried/rcip/assist/styles.css` for the packaged UI.

`useRcipAssist(options)` returns a headless controller. `RcipAssist` uses those
same options and adds `className`, `defaultOpen`, `placeholder`, and `title`.

| Option | Default and behavior |
| --- | --- |
| `runtime` | Required, host-owned runtime |
| `decide(request, { signal })` | Required asynchronous callback; returns a message or action batch |
| `mode` | `read-only`; use `interactive` to propose state-changing actions through host policy |
| `maxBatchSize` | `8`; bounded to `1–32` |
| `delayPresets` | Optional milliseconds for `short`, `medium`, `long`; clamped to `0–10000` |
| `inputPipeline` | Optional ordered processors and voice adapter; `voice: false` disables voice |
| `welcomeMessage` | Optional initial assistant message |

The controller exposes `send`, `submitInput`, `cancel`, `clear`, voice start/stop/
cancel methods, `resolveConfirmation`, messages, snapshot, status, input status/errors,
busy state, and pending confirmation. Full signatures are in the [generated contracts](./api-types).

A turn has one `decide` phase, at most one sequential action batch, and a text-only
`summarize` phase. A non-success outcome stops the batch. No provider or persistence
is bundled. The default voice source is a simulation; it captures no audio.
[Input pipelines and UI behavior](./assist-and-input-pipelines) document customization.

## Explorer — `@binaried/rcip/explorer`

`RcipCapabilityExplorer({ client, className? })` renders a read-only catalog with
context and availability. It never invokes capabilities.
Import `@binaried/rcip/explorer/styles.css`; customize the `--rcip-explorer-*` CSS variables.
