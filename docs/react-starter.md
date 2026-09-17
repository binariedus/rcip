---
title: Standalone React starter for RCIP
description: Run a small React and TypeScript application with RCIP discovery, live reads, confirmed writes, input validation, and cancellation. No backend or model key required.
---
# Run the React starter

The starter is a small application you can copy into your own project. It installs
the public npm package and needs no workspace packages, backend, account, or AI key.
It uses React 19.1 and pins the verified RCIP 2.0.2 runtime; RCIP 2.0.3 changes
discovery and onboarding, without runtime API changes.

## Start locally

Use Node 24 and npm 11.16.0:

```bash
git clone https://github.com/binariedus/rcip.git
cd rcip/templates/react-starter
npm ci
npm run dev
```

Open the local URL printed by Vite. You can move this directory anywhere outside
the cloned repository and run the same commands. `npm run build` typechecks and
builds a production bundle; `npm run preview` serves that bundle locally.

## Try the capability boundary

1. Click **Discover** to see `counter.read` and `counter.increment`.
2. Click **Increment in UI**, then **Read through RCIP**. Both use the current state.
3. Click **Send invalid input**. Schema validation rejects the request before a write.
4. Click **Increment through RCIP**. The count stays unchanged until host approval.
5. Try **Decline** and **Cancel request**, then start a fresh request and **Approve**.

The result panel shows discovery data, invocation outcomes, and local cancellation
status. This demonstrates a consumer calling the SDK; it is not a connected LLM.

## Make it your own

`src/capabilities.ts` declares the stable application contract. `src/App.tsx` binds
it to committed React state and renders the application-owned confirmation UI.
Pass only the client to your own consumer. Replace the counter handler with an
existing application action that already enforces domain and server authorization.

An in-app agent, command palette, or browser-use integration can discover and
invoke the same capabilities. A browser agent needs an application-selected bridge
to this client; the starter does not expose a global object or network endpoint.
See the [consumer guide](./tool-author-guide) for that boundary.

The starter allows one request at a time. Cancelling while confirmation is pending
aborts the request before execution. Cancellation of a handler that has already
performed a side effect is a separate concern; see [lifecycle semantics](./lifecycle).
An approval button is ordinary page UI and does not prove a human activated it.

<a href="/rcip/demo/" target="_self">Try the larger interactive demo</a> · [Read the source](https://github.com/binariedus/rcip/tree/main/templates/react-starter)
