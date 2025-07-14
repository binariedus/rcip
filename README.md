
# RCIP – Runtime Component Interface Protocol for React
**Self‑describing UI contracts & live control centre for modern React applications**

---

## ▸ Executive Summary
RCIP promotes every React component to a **runtime‑discoverable service**.  
A component **declares** what it _is_ and what it _does_; RCIP records this in a lightweight, in‑memory registry that tools can **query** (for documentation) and **invoke** (for orchestration).  
The result is a **living, typed interface layer** that doubles as both _documentation_ and _control centre_ for your running UI.

---

## ▸ Table of Contents
1. [Philosophy](#philosophy)
2. [High‑Level Architecture](#high-level-architecture)
3. [Core Concepts](#core-concepts)
4. [Quick Start](#quick-start)
5. [Building Control‑Centre Tools](#building-control-centre-tools)
6. [Advanced Patterns](#advanced-patterns)
7. [Package Layout](#package-layout)

---

## Philosophy
| Goal | Manifestation in RCIP |
|------|-----------------------|
| **Runtime documentation** | Components publish names, descriptions, and typed action signatures. |
| **Descriptive introspection** | A query API reveals the full interface surface at any moment. |
| **Live control centre** | Any tool can trigger registered actions to steer the UI. |
| **Single source of truth** | Registration + trigger flow are the only contracts; everything else is decoupled. |

---

## High‑Level Architecture
```
┌───────────────────────────────────┐
│           React Tree             │
│ ┌────────────┐    ┌────────────┐ │
│ │ Component A│    │ Component B│ │
│ └─────┬──────┘    └────┬───────┘ │
│       │ register        │ register
└───────┼─────────────────┼─────────
        ▼                 ▼
   ┌──────────────────────────────┐
   │        RCIP Registry         │
   │  • Components metadata       │
   │  • Actions (typed)           │
   └────────┬──────────┬──────────┘
            │ query    │ trigger
            ▼          ▼
   ┌──────────────────────────────┐
   │       Control‑Centre Tools   │
   │  e.g. Assistants, Testbots   │
   └──────────────────────────────┘
```

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Component Record** | Immutable identity (`componentId`), human name, description. |
| **Action Descriptor** | `(payload) ⇒ result` function registered against a component with a unique `actionId`, name, and description. |
| **Registry Controller** | Provides _find_ (introspection) & _trigger_ (invocation) APIs. |
| **Trigger Flow** | Caller specifies `{ componentId | componentName, actionId | actionName, payload }` and receives a typed `result`. |
| **Tool** | A React component that consumes the registry to build higher‑level UX (assistant panel, admin console, automation harness). |

---

## Quick Start

### 1  Install & Wrap
```bash
npm install @binaried/rcip
```
```tsx
import { RcipProvider } from '@binaried/rcip';

function App() {
  return (
    <RcipProvider>
      {/* your component tree */}
    </RcipProvider>
  );
}
```

### 2  Describe a Component
```tsx
import { useComponentInterface } from '@binaried/rcip';

function Counter() {
  const { componentId, addAction } = useComponentInterface(
    'Counter',
    'Simple counter widget'
  );

  const [count, setCount] = useState(0);

  const get = addAction('getCount', 'Return current count', () => count);

  const inc = addAction<void, void>(
    'increment',
    'Increase count by one',
    () => setCount(c => c + 1)
  );

  return <button onClick={() => inc && setCount(c => c + 1)}>{count}</button>;
}
```

### 3  Query & Invoke
```tsx
import { useRcip } from '@binaried/rcip';

function Dashboard() {
  const rcip = useRcip();

  const components = rcip.findComponents({ componentName: 'Counter' });

  const bumpAll = () =>
    components.forEach(c =>
      rcip.trigger({ componentId: c.componentId, actionName: 'increment', payload: undefined })
    );

  return <button onClick={bumpAll}>Increment every counter</button>;
}
```

---

## Building Control‑Centre Tools

A **tool** combines introspection + invocation to offer an interactive panel.

```tsx
import { useRcip, useComponentInterface } from '@binaried/rcip';

function LoggerTool() {
  const { componentId } = useComponentInterface('LoggerTool', 'Console logger');

  const rcip = useRcip();
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const list = rcip.findComponents({});
    list.forEach(rec =>
      rec.actions.forEach(action =>
        setLog(l => [...l, `${rec.componentName}.${action.actionName}`])
      )
    );
  }, []);

  return <pre>{log.join('\n')}</pre>;
}
```

> **Built‑in Example:** `@binaried/rcip/tools/InputAssist` implements an AI‑powered text refinement panel by attaching to any component that registers `getText` / `setText` actions.

---

## Advanced Patterns

| Pattern | Idea |
|---------|------|
| **Middleware** | Wrap `trigger()` to log, audit, or time every action execution. |
| **Multi‑runtime federation** | Mount multiple `RcipProvider` trees to isolate domains (e.g., micro‑frontends). |
| **Remote bridge** | Serialize `trigger` calls over WebSocket to control another browser tab or server‑side preview. |
| **SSR preload** | Register components during server render to pre‑compute a sitemap of interactive regions. |

---

## Package Layout
```
@binaried/rcip
├─ core/
│  ├─ RcipProvider.tsx          # registry & context
│  ├─ useComponentInterface.ts  # component/action hook
│  └─ types.ts
└─ tools/
   └─ InputAssist/              # reference implementation of a control‑centre tool
```

RCIP ships as pure TypeScript + React hooks — no build‑time plugins, no runtime dependencies beyond React.

---
