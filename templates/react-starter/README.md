# RCIP React starter

A standalone React/TypeScript application using the public `@binaried/rcip`
package. No local workspace dependency, backend, model service, or credentials.

Use Node 24 and npm 11.16.0:

```bash
npm ci
npm run dev
```

Open Vite's printed URL. Build with `npm run build`; serve the production build
with `npm run preview`. This directory can be copied outside the RCIP repository.

Try Discover → Increment in UI → Read through RCIP. Then try invalid input,
a confirmed increment, Decline, Cancel request, and Approve. Writes occur only
after approval; cancellation here happens before the handler starts.

`src/capabilities.ts` contains the stable schemas; `src/App.tsx` binds live state
and owns policy and confirmation. Consumers receive only `RcipClient`. Add your
own consumer to connect an in-app assistant, frontend tool, or browser agent.

This is a deterministic SDK example, not a connected AI agent. Ordinary page
approval UI does not distinguish a human from a browser-automation agent.
Application/server authorization still applies.

RCIP is pinned to verified release 2.0.2. Release 2.0.3 adds discovery and
onboarding without changing runtime APIs. The template itself is not published
as an npm package.

[Documentation](https://binariedus.github.io/rcip/react-starter.html) ·
[Consumer guide](https://binariedus.github.io/rcip/tool-author-guide.html) ·
[License](./LICENSE)
