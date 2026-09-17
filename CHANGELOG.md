# Changelog

All notable RCIP changes are documented here. RCIP follows semantic versioning.

## 2.0.3

- Add a standalone React/TypeScript starter using the public npm package, with capability discovery, live reads, confirmed writes, validation, and cancellation.
- Expand agentic UI, in-app agent, frontend tool, and browser-use discovery metadata and integration guidance.
- Publish a compact llms.txt documentation map and a captioned demo walkthrough with source-only starter downloads.
- Keep runtime behavior, public APIs, protocol 1.0, and the existing health-monitoring expiry unchanged.

## 2.0.2

- Expand React UI-agent and tool-calling discovery metadata, use cases, and MCP/WebMCP positioning while making adapter boundaries explicit.
- Add shared local and GitHub Actions commands for registry availability and fresh published-package regression across React 18.2, 18.3, and 19.1.
- Verify the exact registry version after each publish, including browser behavior and live documentation/demo checks.
- Add an explicitly bounded seven-day availability schedule with daily regression, automatic expiry, and no persistent Actions caches or artifact uploads.
- Keep runtime behavior, public APIs, and protocol 1.0 unchanged.

## 2.0.1

- Prevent duplicate invocation IDs during asynchronous policy and pending confirmation.
- Reject binding, availability, and context changes before execution; capture confirmation input independently of caller mutation.
- Release expired/cancelled confirmations and protect catalog/snapshot metadata from mutation.
- Update React bindings only after committed renders and document cancellation, retry, schema, SSR, and lifecycle guarantees.
- Rename the expansion to React Capability Interface Protocol without changing package/API names or protocol 1.0.
- Publish searchable documentation, API contracts, measured entrypoints, a Finance case study, and a browser-only interactive demo.
- Add concurrency, confirmation, lifecycle, SSR/hydration, and static-site browser verification; repair secret-history scanning and patch build dependencies.

## 2.0.0

- Promoted the accepted `2.0.0-beta.5` release candidate to stable without
  runtime or public API changes.
- RCIP 2 provides protocol `1.0` semantic scopes and capabilities, a
  framework-neutral runtime, React bindings, packaged Assist and Explorer
  surfaces, confirmation and cancellation controls, consumer-owned input
  pipelines, and React 18/19 compatibility.
- This major is intentionally incompatible with RCIP 1.x. See
  [the migration guide](docs/migration-v1-to-v2.md).

## 2.0.0-beta.5

- Changed disabled voice input so single click or Space reports that voice is
  unavailable without opening chat or invoking a microphone or provider.
- Kept double-click, long-press, and Enter as direct ways to open chat.

## 2.0.0-beta.4

- Removed the in-chat example prompt section so Assist opens directly into a
  focused conversation and composer experience.
- Removed the corresponding `examplePrompts` UI prop during the v2 beta.

## 2.0.0-beta.3

- Rebuilt the packaged Assist UI as a polished, responsive conversation panel
  with keyboard/touch alternatives, reduced-motion support, accessible status
  announcements, and automatic light/dark presentation.
- Changed the collapsed dot to single-click simulated listening and
  double-click chat opening. The simulation captures no audio, calls no
  provider, and invokes no capability.
- Added consumer-owned voice adapters and ordered audio/text input processors
  for capture → transcription → refinement → Assist pipelines.
- Fixed dragged panel state so closing restores the launcher and the next panel
  opening to the original configured anchor.
- Removed capability disclosure from Assist; the separate read-only Explorer
  remains the capability inspection surface.
- Expanded package and repository documentation with a complete integration
  flow, input-pipeline guide, accessibility behavior, theming, and security
  boundaries.
- Added browser coverage for click arbitration, input processing, keyboard
  controls, drag reset, and the updated responsive UI.

## 2.0.0-beta.2

- Added optional provider-neutral capability usage guidance and schema-valid
  examples to definitions and discovery snapshots.
- Added the packaged `@binaried/rcip/assist` dot, draggable floating panel,
  headless hook, explicit interactive/read-only modes, host confirmation,
  cancellation, bounded sequential batches, and summarize-only phase.
- Added React 18/19 packed-consumer coverage for Assist and its styles export.
- Reworked the standalone pilot to use the packaged Assist with deterministic
  behavior and an optional consumer-owned server-side provider adapter.
- Moved the standalone pilot default from port 4000 to temporary port 4176.

## 2.0.0-beta.1

- Pinned the npm release toolchain and regenerated the lockfile with npm 11 so
  clean CI installs use the same dependency resolution as release preparation.
- No public API or runtime behavior changed from `2.0.0-beta.0`.

## 2.0.0-beta.0

- Allow stable lower-camel capability identifier segments such as
  `polls.prepareCreate`.

- Replaced the component/action registry with protocol 1.0 semantic scopes,
  capabilities, context, and strict JSON contracts.
- Added the framework-neutral runtime with discovery, availability, policy,
  confirmation, cancellation, structured outcomes, and redacted lifecycle
  events.
- Added React provider, context, binding, client, and snapshot hooks.
- Added the optional read-only capability explorer.
- Added ESM, CommonJS, TypeScript declaration, React 18/19, and packed-consumer
  validation.
- Added Apache-2.0 licensing and trusted npm release automation.

This beta is intentionally incompatible with RCIP 1.x. See
[the migration guide](docs/migration-v1-to-v2.md).
