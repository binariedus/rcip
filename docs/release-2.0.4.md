# RCIP 2.0.4

This release adds optional concurrent preflight to the consumer client. Existing
adapters can omit the method; direct invocation and protocol 1.0 stay compatible.
The maintainer selected the 2.0.4 version for this optional API addition.

Use `client.preflight({ requests, signal? })` to assess 1–16 independent proposals.
The report preserves input order and distinguishes readiness, confirmation needed,
and blocked operations. No operation handler runs and no confirmation ticket is
created. Policies must be effect-free and concurrency-safe. State can change after
checking: invocation always checks again, and servers remain authoritative.

See the [tool author guide](./tool-author-guide)
for examples, freshness, cancellation and compatibility. The pilot workbench's
**Check readiness** action illustrates assessment separately from invocation.

The implementation was first verified as a private 2.1.0-rc.1 candidate. Those
benchmark receipts retain that version. Release checks and fresh registry-package
acceptance independently verify 2.0.4; earlier timing measurements are not renamed.

The release also stabilizes fresh packed-consumer checks against transitive Rollup
drift and Vite preview's process environment changes. Review [the changelog](./changelog)
and follow [the release workflow](./releasing) for publication and acceptance.
