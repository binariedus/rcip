# Security policy and trust model

RCIP is a mediation boundary, not a replacement for application authorization.
Every capability handler must enforce the same identity, scope, and domain
rules as the human-facing application path.

## Trust boundaries

- Application definitions, bindings, policy, and host controls are trusted
  product code.
- Tool requests, model output, and invocation arguments are untrusted input.
- Consumer-defined tools receive `RcipClient`; they do not receive
  `runtime.host`.
- Model output never bypasses schema validation, availability, or host policy.
- Confirmation is a fresh, short-lived host decision—not an assertion supplied
  by a tool.

The runtime rechecks capability existence, binding, availability, input, and
policy after confirmation. Confirmations expire after two minutes by default,
are single-use, and reject concurrent reuse of an active invocation identifier.

## Application responsibilities

Effect labels are policy signals, not authorization. Production hosts should
apply server-side authorization, recent authentication, rate limits, durable
audit records, or domain approval when their risk model requires them.

Tools own their provider boundary. When an invocation returns
`confirmation_required`, trusted application code must present the decision
and call `runtime.host.resolveConfirmation`. The packaged Assist panel is
trusted host UI only when mounted by the application with its own runtime; a
model or third-party callback never receives the host confirmation control.

## Data and credentials

Discovery snapshots contain contracts, context, binding state, and availability.
Do not put secrets, tokens, private records, model prompts, or handler references
in definitions, schemas, descriptions, tags, availability reasons, or events.

Keep provider credentials in a trusted server environment. The reference
pilot's optional model adapter runs server-side; only sanitized decisions reach
the browser. It is a demonstration, not a production authentication or
multi-user boundary.

Assist conversations are in-memory and are not persisted by the SDK. A
consumer callback chooses what it transmits externally and is responsible for
notice, consent, minimization, retention, provider policy, and redaction. Do not
assume the snapshot is private merely because it contains no credentials.

## Failure handling

Expected failures return stable, non-sensitive codes. Unexpected handler errors
become `EXECUTION_FAILED`; policy exceptions become
`POLICY_EVALUATION_FAILED`. Raw messages and stacks are masked.

Host observability callbacks must avoid logging sensitive inputs and outputs.
Callback exceptions are isolated from otherwise valid application behavior.

## Reporting vulnerabilities

Follow the private reporting instructions in the repository
[SECURITY.md](../SECURITY.md). Do not disclose a suspected vulnerability in a
public issue before maintainers have reviewed it.
