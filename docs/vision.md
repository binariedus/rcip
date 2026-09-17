---
title: RCIP design principles
description: The design principles behind app-owned semantic capabilities and parallel human and tool interfaces.
---
# RCIP vision

AI delegates and other tools should interact with the meaning of an application,
not scrape its DOM, memorize labels, or receive arbitrary component access.

RCIP gives a React application a compact semantic control plane alongside its
ordinary human interface:

- a scope is a stable product area such as `polls` or `navigation`;
- a capability is a user-meaningful operation such as `polls.create`;
- context identifies which scopes are relevant now;
- a binding connects the contract to live application behavior;
- policy remains application-owned and independent of every consumer tool.

The visual UI remains complete without RCIP. Tools provide another interface
over the same services and state.

## Product boundaries

RCIP models application intent, not React components, DOM nodes, routes, or
model providers. React is the first host adapter; the core contract remains
framework-neutral.

The SDK intentionally ships two optional generic surfaces: a read-only
capability explorer, and a provider-neutral Assist dot/floating panel with a
headless orchestration hook. The consuming application supplies any AI or
deterministic callback. Translators, narrators, command surfaces, and future
integrations can reuse the same callback and client contracts or remain fully
consumer-defined.

Assist input is composable without making providers part of the protocol. A
consumer-owned voice source and ordered audio/text processors can form a chain
such as capture → transcription → refinement → decision. The SDK owns lifecycle
and cancellation; consumers still own capture, transport, credentials, and
provider selection.

A consumer tool can be as small as a dot that owns its own idle, working,
confirmation, success, and error states. The application still owns capability
execution, authorization, and confirmation.

## Future direction

Portable community tools become possible when applications converge on
compatible capability IDs and schemas. Future work may define optional semantic
profiles for common domains such as navigation, content, forms, media, and
accessibility.

Protocol 1.0 does not define a plugin marketplace, remote transport, third-party
sandbox, or universal capability vocabulary. Those can evolve independently
without weakening the current client/host safety boundary.
