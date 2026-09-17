---
title: Protocol 1.0 specification
description: RCIP discovery, context, invocation, confirmation, outcomes, and compatibility rules for the in-process application capability protocol.
---
# RCIP protocol 1.0

RCIP exposes a static semantic catalog and a live application snapshot. The
catalog is declared once; the snapshot combines it with current context,
bindings, availability, and a monotonically increasing revision.

The npm package is versioned independently from the protocol. RCIP package 2.x
implements protocol `1.0`.

## Definitions

`defineRcipApplication` declares application metadata, scopes, and
capabilities. Every capability contains:

- a stable identifier and human-readable description;
- zero or more semantic scopes (an empty list is globally relevant);
- an effect: `read`, `write`, `external`, or `destructive`;
- strict JSON-compatible input and output schemas;
- optional discovery tags;
- optional provider-neutral usage guidance with a `whenToUse` statement and
  schema-valid examples.

Effects inform host policy. They do not replace authentication, authorization,
or domain validation.

Definitions must not contain handlers, credentials, private application data,
DOM references, routes, React components, or provider-specific tool formats.

Identifiers begin with a lowercase ASCII letter. Dot, underscore, and hyphen
separators must each be followed by a lowercase letter; segments may use
lower-camel case (for example, `polls.prepareCreate`). Identifiers are
case-sensitive.

## Runtime surfaces

`runtime.client` implements the generic `RcipClient` surface:

- `getSnapshot()` returns current serializable discovery data;
- `listCapabilities(filter)` filters by context, availability, scope, or
  effect;
- `subscribe(listener)` observes snapshot revisions;
- `invoke(request)` asks the host to run one capability.

A consumer-defined tool receives only this client.

`runtime.host` remains application-owned:

- `bindCapability` installs a live handler and availability check;
- `setContext` changes the active semantic scope;
- `refresh` republishes live availability;
- `resolveConfirmation` accepts or rejects a pending operation.

React host code uses `RcipProvider`, `useRcipContext`, and
`useRcipCapability`. Consumer UI can use `useRcipClient` or receive a client
directly.

## Snapshot semantics

A capability snapshot distinguishes three independent facts:

- `bound`: a live handler is mounted;
- `available`: the bound handler is currently eligible to run;
- `relevance`: `current` when its scope intersects active semantic context,
  otherwise `other`.

“Current” is contextual relevance, not execution state. RCIP does not prescribe
tool progress or activity state.

Snapshots contain contracts and redacted live status only. They never contain
handlers, credentials, confirmation tokens, or private application records.
Usage guidance is discovery metadata, so it must follow the same public and
non-sensitive rules as titles, descriptions, schemas, and tags.

## Assist orchestration

`@binaried/rcip/assist` is an optional consumer over the same client and host
surfaces. A host-provided callback receives a filtered snapshot, in-memory
messages, mode, phase, and completed outcomes. In the decision phase it returns
text or one bounded action batch. If actions ran, a final summarize-only phase
may return text but cannot schedule more actions.

The SDK executes a batch sequentially, stops on the first non-success outcome,
supports cancellation and symbolic bounded delays, and delegates confirmation
resolution to trusted host UI. Read-only mode removes non-read capabilities from
callback discovery and rejects a proposed state-changing action locally. Assist
does not define a provider, prompt format, network transport, or durable chat
store.

## Invocation lifecycle

For each invocation, the runtime:

1. resolves the declared capability and live binding;
2. checks current availability;
3. validates input against the declared schema;
4. asks host policy to allow, deny, or request confirmation;
5. re-runs binding, availability, schema, and policy checks after confirmation;
6. executes the handler with cancellation context;
7. validates output and returns a structured outcome;
8. refreshes the live snapshot after success.

Outcomes are `succeeded`, `confirmation_required`, `failed`, or `denied`.
Expected failures use stable codes. Unexpected implementation details and stack
traces never cross the client boundary.

Invocation IDs remain reserved across policy evaluation and pending confirmation.
Requests and discovery metadata are detached from caller-owned mutable data.
Changed bindings or semantic context invalidate pending approval or policy;
confirmation expiry/cancellation releases retained payloads. See
[lifecycle semantics](./lifecycle.md) for cancellation, SSR, and retry limits.

The runtime performs no automatic retries. Capability contracts must state any
idempotency guarantee required by a consumer.

## Compatibility and versioning

`RCIP_PROTOCOL_VERSION` is the canonical protocol literal.

Within package major 2:

- patch releases fix behavior without changing public contracts;
- minor releases add backward-compatible APIs or optional snapshot fields;
- any incompatible type, schema, outcome, or runtime change requires a new npm
  major version;
- capability contracts owned by applications require their own versioning and
  migration discipline.

Protocol 1.0 is in-process. Remote transports, plugin marketplaces, sandboxing,
and provider-specific function formats are outside this version.
