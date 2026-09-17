---
title: RCIP, WebMCP, MCP Apps, AG-UI, and A2UI
description: Compare application capabilities, browser tool exposure, agent event streams, and generated interfaces without conflating the protocols.
---
# React capabilities, MCP, and WebMCP

These technologies overlap in goals but address different integration boundaries.
This comparison was checked against their official documentation in September 2026.

| Technology | Primary concern | Relationship to RCIP |
| --- | --- | --- |
| [MCP](https://modelcontextprotocol.io/docs/getting-started/intro) | Tools and context exchanged between clients and servers | A transport/integration boundary; RCIP 1.0 is in-process |
| [WebMCP](https://developer.chrome.com/docs/ai/webmcp) | Browser-native exposure of page tools | Closest neighbor; potential future consumer of RCIP contracts |
| [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) | Interactive interfaces delivered by MCP tools to compatible hosts | A different UI hosting boundary |
| [AG-UI](https://docs.ag-ui.com/introduction) | Events connecting agent runtimes to user-facing applications | Can carry application interactions; not the same runtime contract |
| [A2UI](https://a2ui.org/) | Agent-described interfaces rendered by applications | Describes UI; RCIP describes callable application behavior |
| RCIP | Application-owned capabilities, context, policy, confirmation, and outcomes | Framework-neutral core with React bindings and optional consumers |

## WebMCP is more than registration

Current [Chrome guidance](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
includes cancellation, safety annotations, origin controls, and experimental React
integration. An origin trial is available. Do not assume it has no lifecycle or
safety concepts, or that development flags are its only distribution route.

RCIP's value is a coherent application capability model that can serve multiple
consumers without depending on browser support. Direct WebMCP may be sufficient
for a smaller browser-specific integration.

**Direct MCP and WebMCP adapters are planned and are not included in RCIP 2.0.3.**
A future adapter should preserve
`client.invoke`, application-selected exposure, and trusted confirmation rather
than exporting raw handlers. No MCP transport adapter is included either.

RCIP's July 2025 npm release predates Chrome's February 2026 early-preview
announcement. That is a release-history fact, not a claim of priority over all
earlier proposals or related work.

## Browser-use integrations and future discovery

A browser-use tool can consume RCIP's existing client through an application-owned
integration. The [consumer guide](./tool-author-guide) describes the current
discovery/invocation boundary. This applies to custom tools as well as potential
integrations with existing products; it is not a claim that those products already
discover RCIP automatically.

Generic cross-page discovery is a candidate for a future major version alongside
protocol adapters. It needs an explicit exposure decision, origin/session rules,
version negotiation, navigation lifecycle, and a confirmation boundary that the
consumer cannot grant itself. The current release defines no global browser hook
or transport format for that future interface.

## Open specifications and compatibility

WebMCP is an open [Web Machine Learning Community Group draft](https://webmachinelearning.github.io/webmcp/)
with contributors from multiple organizations. It is not exclusive to one browser,
and the draft is not currently a W3C Standard. MCP also has a published protocol
specification. Both names describe concrete integration contracts as well as a
broader application-tooling ecosystem.

RCIP's related ecosystem keywords help developers find this comparison. They do
not claim that an MCP or WebMCP consumer can discover RCIP automatically today.
React applications can use RCIP's current in-process client while keeping future
adapter work separate from their application capability definitions.
