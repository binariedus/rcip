# RCIP – Runtime Component Interface Protocol for React

**A composable interface layer for UI actions, automation, and dynamic control.**

---

## 🧩 Overview

RCIP enables any React component to **declare actions**, expose **runtime descriptions**, and be controlled via a **generic interface**. Think of it as a way to **open up your component tree** for inspection, tooling, and interaction without coupling, boilerplate, or internal hacks.

You define what each component can do, how to invoke it, and what it represents — and RCIP takes care of the rest.

---

## ⚙️ Installation

```bash
npm install rcip
```

Wrap your app with the provider:

```tsx
import { UIActionProvider, IdScope } from 'rcip'

<UIActionProvider>
  <IdScope id="Editor" label="Article Editor" description="Editor for article body">
    <ArticleEditor />
  </IdScope>
</UIActionProvider>
```

Inside your component:

```tsx
const add = useUiActions('Editor')

add('updateContent', {
  type: 'logic',
  label: 'Update Content',
  description: 'Replace full text',
  handler: (v: string) => setContent(v)
})
```

---

## 💡 Motivation

In modern frontend applications, we face recurring challenges:

- No clear boundary to **inspect or interact with live components**
- Difficulty building **developer tools**, **test automation**, or **assistants** that understand UI logic
- No consistent way to **describe** what a component does

RCIP introduces a **descriptive, typed interface** to your UI — so actions, state transitions, and component roles can be inspected and triggered safely.

This opens up your app to:

- 🔍 **DevTools** that visualize and test component behavior
- 🧠 **AI assistants** that introspect, ask questions, and propose edits
- 🧪 **QA automations** that simulate complex workflows
- ⚙️ **Centralized runtime controls** across multiple components

All of this happens **without touching component internals** — just register actions and describe what they mean.

---

## 🧪 Example: AI Editorial Assistant

In our demo, we use RCIP to build a collaborative editing experience:

- `ArticleEditor` exposes:
  - `updateContent` to modify the article body
  - `getInfo` to fetch the current content and its length

- `AssistantPanel`:
  - Uses `getInfo` to retrieve content
  - Calls OpenAI with a prompt (`/refine` or `/describe`)
  - Invokes `updateContent` to apply a suggestion
  - Can query available actions with `ui.describe()`

This setup demonstrates how RCIP allows tools — including AI — to understand and operate your app *as intended*.

---

## 🔍 Design Principles

- ✅ **Describe first**: Label everything. Actions should be inspectable.
- ✅ **Type safety**: Every action has `payload` and `result` types
- ✅ **Isolation**: Components register their capabilities. Nothing leaks.
- ✅ **Pluggable**: Add middleware, logs, or monitors without modifying logic

---

## 📁 Structure

- `UIActionProvider`: Context for managing all nodes and actions
- `IdScope`: Adds description and identity to any component
- `useUiActions(nodeId)`: Registers one or more actions under a scoped node
- `ui.invoke(nodeId, actionId, payload)`: Executes actions dynamically
- `ui.describe()`: Lists all available actions and nodes at runtime

---

## 🛠 Example Commands (from Assistant)

```text
/refine improve opening section
/describe what can I do
```

These commands trigger the assistant to gather context, query `getInfo`, or use the global registry to respond intelligently.

---

## 🧠 Vision

RCIP aims to turn your app into an **open, addressable interface** — for tools, automation, and intelligence to plug into.

Once you describe what your components can do, anything can interact with them.
