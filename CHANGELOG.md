# Changelog

All notable RCIP changes are documented here. RCIP follows semantic versioning.

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
