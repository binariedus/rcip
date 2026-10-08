# RCIP

[![npm](https://img.shields.io/npm/v/@binaried/rcip)](https://www.npmjs.com/package/@binaried/rcip)

**Give agents your app’s capabilities, not a guessing game.**

An agent asked to schedule a visit should request `visits.schedule`, not work out
which of three similar buttons you meant. RCIP lets your application define the
operation, validate the request, decide whether it is allowed, and return the
information the agent actually needs.

That is the point: your product knows what its actions mean. Let it say so.

[Documentation](https://binariedus.github.io/rcip/) · [Quick start](https://binariedus.github.io/rcip/quick-start.html) · [Live demo](https://binariedus.github.io/rcip/demo/) · [Benchmark](https://binariedus.github.io/rcip/benchmark.html)

## Less guessing. More control.

- **Explicit operations.** Typed inputs and outputs, live availability, and structured outcomes replace coordinate and label interpretation. A moved button does not change the capability contract.
- **Application-owned decisions.** Policy, validation, and trusted confirmation sit around your existing handlers. Optional batch preflight finds readiness problems without executing operations; invocation checks again.
- **Deliberate data exposure.** Choose which context and results to share. Scheduling need not send the page’s resident contacts, unrelated records, or screenshots to a model.
- **One contract, several consumers.** Share capabilities with your own assistant, agent integration, or command palette. Your integration supplies the model and transport; neither is bundled.

This makes execution predictable; it does not make the model infallible. An agent
can still choose the wrong operation or submit a wrong but valid value. The app’s
guards and business rules decide what can actually happen.

## Measured on a real workflow

A synthetic maintenance desk: assign two repairs, move a third visit, preserve
its technician and note, and leave the other records untouched.

| Five fresh runs per approach | Browser Use | RCIP, including readiness checks |
| --- | ---: | ---: |
| Median completion | 72.9s | 9.4s |
| Independently verified successes | 5/5 | 5/5 |
| Resident / email / phone markers in model-bound text, median | 10 / 10 / 3 | 0 / 0 / 0 |

**About 7.8× faster in this setup.** Same model, reset data, independent saved-state
checks. Different runners and prompts mean this compares complete approaches,
not an isolated library-speed test. Timings came from the pre-release candidate
later shipped as 2.0.4. [Methodology, all runs, and limitations](https://binariedus.github.io/rcip/benchmark.html).

## Security comes from controlling the surface

RCIP lets you expose a bounded action instead of an entire screen. Its client
validates contracts and applies application policy and confirmation before
calling bound behavior. The application still owns server authorization,
credential storage, and what its context, outputs, and logs reveal. RCIP is not
a sandbox against arbitrary JavaScript in the page.

Zero contact markers in this benchmark means those selected fields were omitted,
not that no information was shared or that every integration is automatically
private. [Security and data exposure](https://binariedus.github.io/rcip/security.html).

## Use it today—React is a binding, not the whole runtime

```sh
npm install @binaried/rcip
```

Despite the name **React Capability Interface Protocol**, `@binaried/rcip/core`
is framework-neutral JavaScript/TypeScript. `@binaried/rcip/react` connects it to
React 18/19 apps. Optional Assist and Explorer add a conversation UI and inspector.

Declare the capability, bind existing behavior, and connect your consumer to the
client. RCIP does not invent handlers or discover arbitrary sites automatically.
[Start an integration](https://binariedus.github.io/rcip/quick-start.html) · [Core and consumer API](https://binariedus.github.io/rcip/tool-author-guide.html).

[WebMCP](https://webmachinelearning.github.io/webmcp/) is a browser-tool draft with
preview support. RCIP works through an application-owned client today, without
requiring that browser API, and can serve in-app or non-browser consumers.
No direct MCP/WebMCP adapter is included. [Where they fit](https://binariedus.github.io/rcip/ecosystem.html).

Apache-2.0 · [Source](https://github.com/binariedus/rcip) · [API reference](https://binariedus.github.io/rcip/api.html)
