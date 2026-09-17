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

Download the [source-only starter ZIP](https://github.com/binariedus/rcip/releases/download/v2.0.3/rcip-react-starter-2.0.3.zip),
extract it, then run `npm ci` and `npm run dev` inside `rcip-react-starter`.
The archive includes the lockfile and license, without dependencies or build outputs.
Alternatively, clone the repository:

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

## Watch the application flow

This 71-second recording shows the larger reference demo: normal UI changes,
capability discovery and invocation, an approved write, a declined delete, and a
layout change. It is a local production build at original interaction speed with
explanatory captions and a deterministic adapter; no AI service is connected.

<video controls playsinline preload="none" aria-label="RCIP application capabilities walkthrough with embedded captions" style="width: 100%; border-radius: 12px;">
  <source src="https://github.com/binariedus/rcip/releases/download/v2.0.3/rcip-2.0.3-walkthrough.mp4" type="video/mp4" />
  Your browser does not support embedded video. Use the download below.
</video>

[Download the captioned video](https://github.com/binariedus/rcip/releases/download/v2.0.3/rcip-2.0.3-walkthrough.mp4)
· [WebVTT captions/transcript](https://github.com/binariedus/rcip/releases/download/v2.0.3/rcip-2.0.3-walkthrough.vtt)
· [Download checksums](https://github.com/binariedus/rcip/releases/download/v2.0.3/SHA256SUMS.txt)

<a href="/rcip/demo/" target="_self">Try the larger interactive demo</a> · [Read the source](https://github.com/binariedus/rcip/tree/main/templates/react-starter)
