# Changelog

All notable RCIP changes are documented here. RCIP follows semantic versioning.

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
