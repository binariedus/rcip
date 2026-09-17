# Contributing to RCIP

Thank you for helping improve the React Capability Interface Protocol.

## Development

Use Node.js 22 or 24.

```bash
npm ci
npm run check
npm run test:e2e
```

RCIP contracts describe stable product intent. Contributions must not expose
DOM mechanics, component internals, provider-specific model formats, secrets,
or application-specific behavior through the generic SDK.

Keep the core framework-neutral and React code in its dedicated package
surface. Provider adapters belong in examples or consumer applications.

Behavioral automation uses Playwright against composed browser behavior. This
workspace does not add unit or mock-based test suites.

## Pull requests

- Keep changes narrowly scoped and explain public API compatibility.
- Update protocol, security, migration, and changelog documentation when
  behavior or types change.
- Include packed-package validation for export or dependency changes.
- Never commit credentials, local environment files, generated reports, or npm
  tarballs.

By contributing, you agree that your contribution is licensed under
Apache-2.0.
