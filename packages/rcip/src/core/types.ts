/** JSON primitive accepted at RCIP contract boundaries. */
export type RcipJsonPrimitive = boolean | null | number | string

/** Serializable value accepted by capability inputs and outputs. */
export type RcipJsonValue =
  | RcipJsonPrimitive
  | RcipJsonObject
  | RcipJsonValue[]

/** Serializable JSON object with recursively compatible values. */
export interface RcipJsonObject {
  [key: string]: RcipJsonValue
}

/** JSON Schema document used for runtime input and output validation. */
export type RcipJsonSchema = boolean | RcipJsonObject

/** Stable wire-contract version implemented by this package. */
export const RCIP_PROTOCOL_VERSION = '1.0' as const

export type RcipProtocolVersion = typeof RCIP_PROTOCOL_VERSION

/** Host policy signal describing the class of application effect. */
export type RcipCapabilityEffect =
  | 'read'
  | 'write'
  | 'external'
  | 'destructive'

/** Stable, public metadata describing one RCIP-enabled application. */
export interface RcipApplicationMetadata {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly version?: string
}

/** Conceptual application area used to organize capability relevance. */
export interface RcipScopeDefinition {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly parentId?: string
}

/** One valid, tool-readable example for a capability input contract. */
export interface RcipCapabilityExample<
  Input extends RcipJsonValue = RcipJsonValue,
> {
  readonly description: string
  readonly input: Input
}

/** Optional provider-neutral guidance for capability consumers. */
export interface RcipCapabilityUsage<
  Input extends RcipJsonValue = RcipJsonValue,
> {
  readonly whenToUse: string
  readonly examples?: readonly RcipCapabilityExample<Input>[]
}

/** Static semantic contract for one user-meaningful application operation. */
export interface RcipCapabilityDefinition<
  Input extends RcipJsonValue = RcipJsonValue,
  Output extends RcipJsonValue = RcipJsonValue,
> {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly scopeIds: readonly string[]
  readonly effect: RcipCapabilityEffect
  readonly inputSchema: RcipJsonSchema
  readonly outputSchema: RcipJsonSchema
  readonly tags?: readonly string[]
  readonly usage?: RcipCapabilityUsage<Input>
  readonly __types?: {
    readonly input: Input
    readonly output: Output
  }
}

/** Static protocol catalog used to create an RCIP runtime. */
export interface RcipApplicationDefinition {
  readonly protocolVersion: RcipProtocolVersion
  readonly application: RcipApplicationMetadata
  readonly scopes: readonly RcipScopeDefinition[]
  readonly capabilities: readonly RcipCapabilityDefinition[]
}

/** Live host decision describing whether a bound capability can currently run. */
export interface RcipAvailability {
  readonly available: boolean
  readonly reasonCode?: string
  readonly reason?: string
}

/** Live semantic scopes relevant to the user's current application context. */
export interface RcipSemanticContext {
  readonly activeScopeIds: readonly string[]
  readonly primaryScopeId?: string
}

/** Trusted execution metadata supplied to a bound capability handler. */
export interface RcipCapabilityHandlerContext {
  readonly signal?: AbortSignal
  readonly invocationId: string
  readonly requestedAt: number
  readonly semanticContext: RcipSemanticContext
}

/** Live application implementation for a declared capability contract. */
export interface RcipCapabilityBinding<
  Input extends RcipJsonValue = RcipJsonValue,
  Output extends RcipJsonValue = RcipJsonValue,
> {
  readonly execute: (
    input: Input,
    context: RcipCapabilityHandlerContext,
  ) => Output | Promise<Output>
  readonly getAvailability?: () => RcipAvailability
}

/** Serializable discovery record combining a contract with live host state. */
export interface RcipCapabilitySnapshot {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly scopeIds: readonly string[]
  readonly effect: RcipCapabilityEffect
  readonly inputSchema: RcipJsonSchema
  readonly outputSchema: RcipJsonSchema
  readonly tags: readonly string[]
  readonly usage?: RcipCapabilityUsage
  readonly bound: boolean
  readonly available: boolean
  readonly availability?: RcipAvailability
  readonly relevance: 'current' | 'other'
}

/** Complete serializable discovery view available to consumer tools. */
export interface RcipApplicationSnapshot {
  readonly protocolVersion: RcipProtocolVersion
  readonly revision: number
  readonly application: RcipApplicationMetadata
  readonly scopes: readonly RcipScopeDefinition[]
  readonly context: RcipSemanticContext
  readonly capabilities: readonly RcipCapabilitySnapshot[]
}

/** Optional filters supported by {@link RcipClient.listCapabilities}. */
export interface RcipCapabilityFilter {
  readonly context?: 'all' | 'current'
  readonly availableOnly?: boolean
  readonly scopeId?: string
  readonly effect?: RcipCapabilityEffect
}

/** Request to invoke one capability through the validated client boundary. */
export interface RcipInvocationRequest {
  readonly capabilityId: string
  readonly input: RcipJsonValue
  readonly invocationId?: string
  readonly signal?: AbortSignal
}

/** Redacted JSON Schema validation issue safe for a consumer tool. */
export interface RcipValidationIssue {
  readonly instancePath: string
  readonly keyword: string
  readonly message: string
}

/** Stable machine-readable failure codes returned by protocol 1.0. */
export type RcipErrorCode =
  | 'CAPABILITY_NOT_FOUND'
  | 'CAPABILITY_UNBOUND'
  | 'CAPABILITY_UNAVAILABLE'
  | 'INPUT_INVALID'
  | 'POLICY_DENIED'
  | 'POLICY_EVALUATION_FAILED'
  | 'CONFIRMATION_DECLINED'
  | 'CONFIRMATION_EXPIRED'
  | 'CONFIRMATION_NOT_FOUND'
  | 'EXECUTION_ABORTED'
  | 'EXECUTION_FAILED'
  | 'OUTPUT_INVALID'
  | 'INVOCATION_ALREADY_ACTIVE'

/** Structured, non-sensitive invocation failure detail. */
export interface RcipInvocationError {
  readonly code: RcipErrorCode
  readonly message: string
  readonly validationIssues?: readonly RcipValidationIssue[]
}

/** Terminal successful capability outcome with validated output. */
export interface RcipInvocationSucceeded {
  readonly status: 'succeeded'
  readonly invocationId: string
  readonly capabilityId: string
  readonly output: RcipJsonValue
}

/** Terminal failed or host-denied capability outcome. */
export interface RcipInvocationFailed {
  readonly status: 'failed' | 'denied'
  readonly invocationId: string
  readonly capabilityId: string
  readonly error: RcipInvocationError
}

/** Non-terminal request for a fresh host-owned confirmation decision. */
export interface RcipInvocationConfirmationRequired {
  readonly status: 'confirmation_required'
  readonly invocationId: string
  readonly capabilityId: string
  readonly confirmation: {
    readonly id: string
    readonly title: string
    readonly description: string
    readonly effect: RcipCapabilityEffect
    readonly expiresAt: number
  }
}

/** Every outcome returned from invocation or confirmation resolution. */
export type RcipInvocationOutcome =
  | RcipInvocationSucceeded
  | RcipInvocationFailed
  | RcipInvocationConfirmationRequired

/** Current inputs supplied to the host's authoritative policy. */
export interface RcipPolicyContext {
  readonly capability: RcipCapabilitySnapshot
  readonly input: RcipJsonValue
  readonly semanticContext: RcipSemanticContext
  readonly confirmed: boolean
}

/** Host policy response for one invocation attempt. */
export type RcipPolicyDecision =
  | { readonly decision: 'allow' }
  | { readonly decision: 'deny'; readonly reason?: string }
  | { readonly decision: 'confirm'; readonly reason?: string }

/** Host-owned policy callback that may synchronously or asynchronously decide. */
export type RcipInvocationPolicy = (
  context: RcipPolicyContext,
) => RcipPolicyDecision | Promise<RcipPolicyDecision>

/** Redacted lifecycle phase emitted for application observability. */
export type RcipRuntimeEventPhase =
  | 'requested'
  | 'confirmation_requested'
  | 'confirmation_declined'
  | 'started'
  | 'succeeded'
  | 'failed'
  | 'denied'

/** Redacted invocation lifecycle event supplied only to the host callback. */
export interface RcipRuntimeEvent {
  readonly timestamp: number
  readonly invocationId: string
  readonly capabilityId: string
  readonly phase: RcipRuntimeEventPhase
  readonly errorCode?: RcipErrorCode
}

/** Runtime configuration controlled by the host application. */
export interface RcipRuntimeOptions {
  readonly confirmationTtlMs?: number
  readonly createId?: (prefix: string) => string
  readonly onEvent?: (event: RcipRuntimeEvent) => void
  readonly policy?: RcipInvocationPolicy
}

/**
 * Narrow consumer surface for AI delegates, dashboards, and other tools.
 * Host-only binding and policy controls are intentionally excluded.
 */
export interface RcipClient {
  readonly getSnapshot: () => RcipApplicationSnapshot
  readonly listCapabilities: (
    filter?: RcipCapabilityFilter,
  ) => readonly RcipCapabilitySnapshot[]
  readonly invoke: (
    request: RcipInvocationRequest,
  ) => Promise<RcipInvocationOutcome>
  readonly subscribe: (listener: () => void) => () => void
}

/** Trusted application surface for binding, context, and confirmation control. */
export interface RcipHostController {
  readonly bindCapability: <
    Input extends RcipJsonValue,
    Output extends RcipJsonValue,
  >(
    definition: RcipCapabilityDefinition<Input, Output>,
    binding: RcipCapabilityBinding<Input, Output>,
  ) => () => void
  readonly refresh: () => void
  readonly resolveConfirmation: (
    confirmationId: string,
    approved: boolean,
  ) => Promise<RcipInvocationOutcome>
  readonly setContext: (context: RcipSemanticContext) => void
}

/** Paired client and host surfaces for one application definition. */
export interface RcipRuntime {
  readonly client: RcipClient
  readonly host: RcipHostController
}
