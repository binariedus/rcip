---
layout: home
title: React UI agents, AI assistants, and tool calling
description: Add React tool calling and UI-agent capabilities with live application context, JSON Schema validation, policy, and human confirmation.
hero:
  name: RCIP
  text: Give AI assistants the actions of your React app.
  tagline: React capabilities for AI assistants, UI agents, and tool calling. Your application controls context, validation, policy, confirmation, and execution.
  actions:
    - theme: brand
      text: Get started
      link: /quick-start
    - theme: alt
      text: Try the interactive demo
      link: /demo/
      target: _self
    - theme: alt
      text: View on GitHub
      link: https://github.com/binariedus/rcip
features:
  - title: Stable product intent
    details: Declare capabilities such as todos.create. Bind them to existing behavior without exposing the DOM or component instances.
  - title: Application-owned decisions
    details: Validate schemas, check current availability, apply policy, and resolve confirmation in trusted host UI.
  - title: Choose your consumer
    details: Use the headless client, packaged Assist, a command palette, or your own integration. No model service or credentials are bundled.
---

## React Capability Interface Protocol

```sh
npm install @binaried/rcip
```

RCIP 2.0.2 implements the in-process protocol 1.0. Its core is framework-neutral;
React bindings support React 18 and 19. Optional Assist and Explorer have separate imports.

Start with a single useful action, then share the same capability contract across
human-facing application behavior and assistant integrations.

[Understand the architecture](./semantic-capabilities) · [Read the Finance case study](./finance-case-study) · [Inspect the security boundary](./security)

## React tool calling and browser agents

Declare the application actions an assistant or UI agent can request, bind them
to current React state, and route tool calls through the validated RCIP client.
Your consumer supplies the model/provider or browser-agent integration.
[Explore the architecture](./semantic-capabilities).

## How RCIP relates to MCP and WebMCP

RCIP shares the goal of exposing useful application tools. It currently runs
in-process; **direct MCP and WebMCP adapters are planned and are not included**.
[Compare the integration boundaries](./ecosystem).
