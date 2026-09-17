---
title: React UI agents and tool calling through semantic capabilities
description: A practical architecture for React tool calling that reuses application behavior, keeps policy in the host, and reduces dependence on DOM structure.
---
# React UI agents and tool calling through capabilities

A support assistant needs to open the right Finance page. A command palette needs
the same operation. A browser agent might need it later. Each consumer can learn
the page's buttons and URLs, or the application can declare the intent once.

```text
consumer intent → capability contract → current availability
                → input validation → host policy → confirmation
                → existing application action → validated outcome
```

RCIP implements this in-process boundary. It does not infer capabilities from a
component tree. Application developers choose and implement the exposed surface.

## Start with a product operation

Prefer `finance.navigation.open` with an enumerated destination over a generic
`clickElement` operation. Keep routing details inside the application. A capability
contract describes the input, output, effect, and intended use; a binding connects
it to current behavior and permission state.

The contract can stay stable while panels move or visual styles change. That reduces
the consumer's dependence on presentation, but does not eliminate integration work:
developers must maintain the contract and verify its domain behavior.

## Keep application authority explicit

Discovery helps consumers choose relevant operations. It does not authorize them.
Runtime checks can reject unavailable actions or ask for host confirmation, while
the server remains responsible for identity, tenant scope, and business rules.
A model proposing an action cannot approve it through `RcipClient`.

The boundary is cooperative JavaScript architecture, not isolation from malicious
code executing in the same page. See the [security model](./security).

## Compare automation fairly

Role-based browser automation can survive a layout change too. Compare maintained
solutions for the same task: integration effort, number of interactions, ambiguity,
permission failures, and maintenance after a meaningful UI change. Do not select
an intentionally fragile CSS selector to manufacture a win.

In the <a href="/rcip/demo/" target="_self">demo</a>, change the panel layout and invoke the same operation. The
contract and result stay the same. The example makes no latency or reliability
percentage claim; those require a measured workload.

## Share a contract across consumers

The core exposes discovery and invocation; React supplies lifecycle bindings.
Assist adds a bounded provider-neutral conversation loop, and Explorer displays
the current catalog without executing it. Other consumers can use the same client.

For a small application with one action, a direct function may be enough. RCIP is
useful when a consistent capability boundary is worth maintaining across features
and consumers. [Build the first capability](./quick-start).

## React function calling with application context

A consumer can translate a model's function/tool call into a capability ID and
JSON input, then call `client.invoke`. RCIP supplies contextual discovery, input
and output validation, and the host's policy and confirmation boundary. The
consumer owns model-specific tool definitions and response translation; RCIP does
not bundle provider credentials or a provider transport.

For a React UI agent, the same capability can read current state or request an
application action. Hooks update the binding after React commits a render, so the
contract can follow application state without exposing component instances.

## Browser use in React applications

Browser use describes a class of agent workflows, not just one product. RCIP's
application capabilities can serve those workflows today when a consumer supplies
the connection. An agentic UI or in-app agent can share the same frontend tools
with a custom browser-automation consumer.

A browser agent can interact through the visible UI or through application
capabilities when an integration gives it access to the RCIP client. Semantic
actions help when the application can expose stable intent and domain checks.
Browser automation remains useful for visual checks and applications without a
capability integration. Installing RCIP alone does not connect a browser-agent
product or make the page discoverable through WebMCP.

See [RCIP, MCP, and WebMCP](./ecosystem) for current boundaries and the planned
adapter direction.
