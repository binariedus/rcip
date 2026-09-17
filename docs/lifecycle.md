---
title: Lifecycle, confirmation, and troubleshooting
description: Understand RCIP binding ownership, React Strict Mode, availability refresh, SSR hydration, asynchronous policy, cancellation, and retry limits.
---
# Lifecycle and troubleshooting

## Definitions and bindings

Declare stable capability objects outside render. Bind the same definition object
that belongs to the runtime catalog. Duplicate live bindings for one ID throw;
unbinding removes only the installed handler. Strict Mode effect setup/cleanup
is supported. React bindings update handlers after committed renders, so an
abandoned render does not publish speculative behavior.

A capability may be declared but unbound. Discovery exposes `bound`, `available`,
and contextual `relevance` separately. Context contains declared semantic scope IDs, not an implicit tenant or record
identity. Hosts must enforce tenant/record changes in their bindings and policy.
Scope relevance is not authorization:
`context: 'current'` filters discovery, not invocation permission.

## Context and availability

Use one mounted `useRcipContext` owner per runtime. Nested owners do not merge:
they overwrite context, and unmount clears it. Publish the combined scope list
from a single owner when multiple areas are relevant.

Set binding `revision` to a primitive that changes when availability changes, or
call `runtime.host.refresh()`. Handlers and availability checks use current committed
React state; snapshots remain cached until refresh. `getSnapshot()` returns the
same deeply immutable object until its revision changes. Do not mutate metadata.

The runtime copies contract metadata, invocation input, and successful output.
Inputs and outputs must be plain JSON: finite numbers, strings, booleans, null,
arrays, and plain objects. Cycles, class instances, undefined, and non-finite numbers
are rejected. A handler receives a detached input copy; modifying it cannot rewrite
the original request or a pending confirmation.

## Asynchronous policy and confirmation

Invocation IDs are reserved before policy begins, including while confirmation
is pending. Reuse returns `INVOCATION_ALREADY_ACTIVE`; IDs are not durable
idempotency keys after completion.

After awaiting policy, RCIP rechecks binding identity, semantic context, availability,
and cancellation. A changed binding yields `CAPABILITY_UNBOUND`, changed context
`POLICY_DENIED`, and lost availability `CAPABILITY_UNAVAILABLE`. Start a fresh
invocation after rediscovering state; RCIP never retries automatically.

Confirmation captures the original operation. Approval is single-use and rechecks
policy and availability. A changed binding or semantic context while the dialog is
pending denies the operation. Default expiry is two minutes. Expiry and cancellation
release payloads, listeners, and ID reservations. The runtime retains only the latest
256 non-sensitive expiry/cancellation receipts; older IDs return `CONFIRMATION_NOT_FOUND`.

## Cancellation and effects

Abort before execution prevents starting the handler and releases a pending
policy wait even if its callback has not settled. The callback itself has no
cancellation parameter and may still finish; its late result cannot execute
the cancelled operation. During execution, the handler
must cooperate with its signal, for example by passing it to `fetch`. Unmounting
removes future access but does not automatically cancel an already-running handler.
If a handler completes successfully after an abort request, RCIP reports success:
no rollback is implied. A thrown error after abort is reported as `EXECUTION_ABORTED`;
that still does not prove that no external effect occurred.

Output validation happens after execution. `OUTPUT_INVALID` can mean that a write
already happened but its response was invalid. Do not blindly retry writes after
validation failures, transport failures, or cancellation. Own idempotency at the
application/backend boundary.

## SSR and hydration

Create a separate runtime per server request and one stable runtime per mounted
client application. Never share request-specific context through a server singleton.
React effects bind capabilities only after hydration, so the initial server and
client catalogs/context must agree. Treat the server snapshot as unbound unless
you intentionally install server-owned bindings. Do not serialize handlers or host controls.

## JSON Schema support

RCIP uses Ajv 8's JSON Schema **2020-12** implementation with `strict: true` and
`allErrors: true`. Input and output are validated; values are not coerced and
additional properties are not removed. Declare `additionalProperties: false`
when your contract requires it. Schema compilation happens at binding (or earlier
for usage examples); invalid schemas throw as host configuration errors.

No custom formats, `ajv-formats`, remote-reference loading, or custom keywords are
installed. Use supported 2020-12 schemas with self-contained references and validate
any application-specific format in trusted domain code.
