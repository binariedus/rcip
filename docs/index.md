---
layout: home
title: React capabilities for AI assistants and tools
description: RCIP lets React apps expose typed capabilities without DOM scraping. Discover live context, validate inputs, enforce policy, and confirm actions in application code.
hero:
  name: RCIP
  text: Give tools the meaning of your application.
  tagline: Typed capabilities for React apps and AI assistants. Your application controls discovery, policy, confirmation, and execution.
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

RCIP 2.0.1 implements the in-process protocol 1.0. Its core is framework-neutral;
React bindings support React 18 and 19. Optional Assist and Explorer have separate imports.

Start with a single useful action, then share the same capability contract across
human-facing application behavior and assistant integrations.

[Understand the architecture](./semantic-capabilities) · [Read the Finance case study](./finance-case-study) · [Inspect the security boundary](./security)
