import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";

import type {
  RcipClient,
  RcipApplicationDefinition,
  RcipApplicationSnapshot,
  RcipAvailability,
  RcipCapabilityBinding,
  RcipCapabilityDefinition,
  RcipCapabilityFilter,
  RcipCapabilityHandlerContext,
  RcipCapabilitySnapshot,
  RcipErrorCode,
  RcipHostController,
  RcipInvocationFailed,
  RcipInvocationOutcome,
  RcipInvocationRequest,
  RcipJsonValue,
  RcipPolicyDecision,
  RcipRuntime,
  RcipRuntimeEvent,
  RcipRuntimeOptions,
  RcipSemanticContext,
  RcipValidationIssue,
} from "./types";

interface InternalBinding {
  readonly execute: (
    input: RcipJsonValue,
    context: RcipCapabilityHandlerContext,
  ) => Promise<RcipJsonValue>;
  readonly getAvailability: () => RcipAvailability;
  readonly validateInput: ValidateFunction<RcipJsonValue>;
  readonly validateOutput: ValidateFunction<RcipJsonValue>;
}

interface PendingConfirmation {
  readonly confirmationId: string;
  readonly expiresAt: number;
  readonly request: RcipInvocationRequest;
  readonly invocationId: string;
}

const DEFAULT_CONFIRMATION_TTL_MS = 120_000;
const IDENTIFIER_PATTERN = /^[a-z][A-Za-z0-9]*(?:[._-][a-z][A-Za-z0-9]*)*$/;
let fallbackIdSequence = 0;

function defaultCreateId(prefix: string): string {
  fallbackIdSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${fallbackIdSequence.toString(36)}`;
}

function defaultPolicy(
  effect: RcipCapabilitySnapshot["effect"],
  confirmed: boolean,
): "allow" | "confirm" | "deny" {
  if (effect === "read" || confirmed) return "allow";
  if (effect === "destructive") return "confirm";
  return "deny";
}

function validationIssues(
  errors: ErrorObject[] | null | undefined,
): readonly RcipValidationIssue[] {
  return (errors ?? []).map((error) => ({
    instancePath: error.instancePath,
    keyword: error.keyword,
    message: error.message ?? "Schema validation failed.",
  }));
}

function failedOutcome(
  invocationId: string,
  capabilityId: string,
  code: RcipErrorCode,
  message: string,
  status: "failed" | "denied" = "failed",
  issues?: readonly RcipValidationIssue[],
): RcipInvocationFailed {
  return {
    status,
    invocationId,
    capabilityId,
    error: {
      code,
      message,
      validationIssues: issues,
    },
  };
}

function assertDefinition(definition: RcipApplicationDefinition): void {
  if (!IDENTIFIER_PATTERN.test(definition.application.id)) {
    throw new Error(
      `Invalid RCIP application id: ${definition.application.id}`,
    );
  }

  const scopeIds = new Set<string>();
  for (const scope of definition.scopes) {
    if (!IDENTIFIER_PATTERN.test(scope.id) || scopeIds.has(scope.id)) {
      throw new Error(`Invalid or duplicate RCIP scope id: ${scope.id}`);
    }
    scopeIds.add(scope.id);
  }

  for (const scope of definition.scopes) {
    if (scope.parentId && !scopeIds.has(scope.parentId)) {
      throw new Error(
        `RCIP scope ${scope.id} references missing parent ${scope.parentId}`,
      );
    }
  }

  const capabilityIds = new Set<string>();
  for (const capability of definition.capabilities) {
    if (
      !IDENTIFIER_PATTERN.test(capability.id) ||
      capabilityIds.has(capability.id)
    ) {
      throw new Error(
        `Invalid or duplicate RCIP capability id: ${capability.id}`,
      );
    }
    capabilityIds.add(capability.id);
    for (const scopeId of capability.scopeIds) {
      if (!scopeIds.has(scopeId)) {
        throw new Error(
          `RCIP capability ${capability.id} references missing scope ${scopeId}`,
        );
      }
    }
  }
}

function makeBinding<Input extends RcipJsonValue, Output extends RcipJsonValue>(
  ajv: Ajv2020,
  definition: RcipCapabilityDefinition<Input, Output>,
  binding: RcipCapabilityBinding<Input, Output>,
): InternalBinding {
  const validateInput = ajv.compile<Input>(definition.inputSchema);
  const validateOutput = ajv.compile<Output>(definition.outputSchema);

  return {
    async execute(input, context) {
      if (!validateInput(input)) {
        throw new Error(
          "RCIP attempted to execute input that was not validated.",
        );
      }
      return binding.execute(input, context);
    },
    getAvailability: binding.getAvailability ?? (() => ({ available: true })),
    validateInput,
    validateOutput,
  };
}

/** Creates an isolated RCIP runtime for one application catalog. */
export function createRcipRuntime(
  definition: RcipApplicationDefinition,
  options: RcipRuntimeOptions = {},
): RcipRuntime {
  assertDefinition(definition);

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const createId = options.createId ?? defaultCreateId;
  const confirmationTtlMs =
    options.confirmationTtlMs ?? DEFAULT_CONFIRMATION_TTL_MS;
  const definitions = new Map(
    definition.capabilities.map((capability) => [capability.id, capability]),
  );
  const scopeIds = new Set(definition.scopes.map((scope) => scope.id));
  const bindings = new Map<string, InternalBinding>();
  const confirmations = new Map<string, PendingConfirmation>();
  const activeInvocationIds = new Set<string>();
  const subscribers = new Set<() => void>();
  let semanticContext: RcipSemanticContext = { activeScopeIds: [] };
  let revision = 0;
  let snapshot: RcipApplicationSnapshot;

  function safeAvailability(
    binding: InternalBinding | undefined,
  ): RcipAvailability | undefined {
    if (!binding) return undefined;
    try {
      return binding.getAvailability();
    } catch {
      return {
        available: false,
        reasonCode: "AVAILABILITY_CHECK_FAILED",
        reason: "The application could not determine current availability.",
      };
    }
  }

  function capabilitySnapshot(
    capability: RcipCapabilityDefinition,
  ): RcipCapabilitySnapshot {
    const binding = bindings.get(capability.id);
    const availability = safeAvailability(binding);
    const relevant =
      capability.scopeIds.length === 0 ||
      capability.scopeIds.some((scopeId) =>
        semanticContext.activeScopeIds.includes(scopeId),
      );

    return {
      id: capability.id,
      title: capability.title,
      description: capability.description,
      scopeIds: [...capability.scopeIds],
      effect: capability.effect,
      inputSchema: capability.inputSchema,
      outputSchema: capability.outputSchema,
      tags: [...(capability.tags ?? [])],
      bound: Boolean(binding),
      available: Boolean(binding && availability?.available),
      availability,
      relevance: relevant ? "current" : "other",
    };
  }

  function buildSnapshot(): RcipApplicationSnapshot {
    return {
      protocolVersion: definition.protocolVersion,
      revision,
      application: { ...definition.application },
      scopes: definition.scopes.map((scope) => ({ ...scope })),
      context: {
        activeScopeIds: [...semanticContext.activeScopeIds],
        primaryScopeId: semanticContext.primaryScopeId,
      },
      capabilities: definition.capabilities.map(capabilitySnapshot),
    };
  }

  function refresh(): void {
    revision += 1;
    snapshot = buildSnapshot();
    for (const subscriber of subscribers) {
      try {
        subscriber();
      } catch {
        // A diagnostic subscriber must not break application behavior.
      }
    }
  }

  function emit(event: RcipRuntimeEvent): void {
    try {
      options.onEvent?.(event);
    } catch {
      // Observability callbacks are isolated from the invocation contract.
    }
  }

  function emitOutcome(outcome: RcipInvocationOutcome): void {
    if (outcome.status === "succeeded") {
      emit({
        timestamp: Date.now(),
        invocationId: outcome.invocationId,
        capabilityId: outcome.capabilityId,
        phase: "succeeded",
      });
      return;
    }
    if (outcome.status === "confirmation_required") return;
    emit({
      timestamp: Date.now(),
      invocationId: outcome.invocationId,
      capabilityId: outcome.capabilityId,
      phase: outcome.status,
      errorCode: outcome.error.code,
    });
  }

  async function executeInvocation(
    request: RcipInvocationRequest,
    confirmed: boolean,
    fixedInvocationId?: string,
  ): Promise<RcipInvocationOutcome> {
    const invocationId =
      fixedInvocationId ?? request.invocationId ?? createId("invocation");
    const capabilityId = request.capabilityId;

    if (activeInvocationIds.has(invocationId)) {
      return failedOutcome(
        invocationId,
        capabilityId,
        "INVOCATION_ALREADY_ACTIVE",
        "An invocation with this id is already active.",
      );
    }

    emit({
      timestamp: Date.now(),
      invocationId,
      capabilityId,
      phase: "requested",
    });

    const capability = definitions.get(capabilityId);
    if (!capability) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "CAPABILITY_NOT_FOUND",
        "The requested capability is not part of this application.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    const binding = bindings.get(capabilityId);
    if (!binding) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "CAPABILITY_UNBOUND",
        "The requested capability has no live application binding.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    const availability = safeAvailability(binding);
    if (!availability?.available) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "CAPABILITY_UNAVAILABLE",
        availability?.reason ?? "The requested capability is not available.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    if (!binding.validateInput(request.input)) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "INPUT_INVALID",
        "The capability input does not match its declared schema.",
        "failed",
        validationIssues(binding.validateInput.errors),
      );
      emitOutcome(outcome);
      return outcome;
    }

    if (request.signal?.aborted) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "EXECUTION_ABORTED",
        "The capability invocation was cancelled.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    const currentCapability = capabilitySnapshot(capability);
    let policyDecision: RcipPolicyDecision;
    try {
      policyDecision = options.policy
        ? await options.policy({
            capability: currentCapability,
            input: request.input,
            semanticContext,
            confirmed,
          })
        : {
            decision: defaultPolicy(capability.effect, confirmed),
          };
      if (!["allow", "confirm", "deny"].includes(policyDecision.decision)) {
        throw new Error("Invalid policy decision.");
      }
    } catch {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "POLICY_EVALUATION_FAILED",
        "The host application could not evaluate this operation safely.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    if (request.signal?.aborted) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "EXECUTION_ABORTED",
        "The capability invocation was cancelled.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    if (policyDecision.decision === "deny") {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "POLICY_DENIED",
        policyDecision.reason ?? "The host application denied this operation.",
        "denied",
      );
      emitOutcome(outcome);
      return outcome;
    }

    if (policyDecision.decision === "confirm") {
      if (confirmed) {
        const outcome = failedOutcome(
          invocationId,
          capabilityId,
          "POLICY_DENIED",
          "The host policy did not allow the confirmed operation.",
          "denied",
        );
        emitOutcome(outcome);
        return outcome;
      }

      const confirmationId = createId("confirmation");
      const expiresAt = Date.now() + confirmationTtlMs;
      confirmations.set(confirmationId, {
        confirmationId,
        expiresAt,
        request,
        invocationId,
      });
      emit({
        timestamp: Date.now(),
        invocationId,
        capabilityId,
        phase: "confirmation_requested",
      });
      return {
        status: "confirmation_required",
        invocationId,
        capabilityId,
        confirmation: {
          id: confirmationId,
          title: capability.title,
          description: policyDecision.reason ?? capability.description,
          effect: capability.effect,
          expiresAt,
        },
      };
    }

    activeInvocationIds.add(invocationId);
    emit({
      timestamp: Date.now(),
      invocationId,
      capabilityId,
      phase: "started",
    });

    try {
      const output = await binding.execute(request.input, {
        signal: request.signal,
        invocationId,
        requestedAt: Date.now(),
        semanticContext,
      });
      if (!binding.validateOutput(output)) {
        const outcome = failedOutcome(
          invocationId,
          capabilityId,
          "OUTPUT_INVALID",
          "The capability output does not match its declared schema.",
          "failed",
          validationIssues(binding.validateOutput.errors),
        );
        emitOutcome(outcome);
        return outcome;
      }
      const outcome: RcipInvocationOutcome = {
        status: "succeeded",
        invocationId,
        capabilityId,
        output,
      };
      emitOutcome(outcome);
      refresh();
      return outcome;
    } catch (error) {
      const aborted =
        request.signal?.aborted ||
        (error instanceof Error && error.name === "AbortError");
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        aborted ? "EXECUTION_ABORTED" : "EXECUTION_FAILED",
        aborted
          ? "The capability invocation was cancelled."
          : "The application could not complete the capability.",
      );
      emitOutcome(outcome);
      return outcome;
    } finally {
      activeInvocationIds.delete(invocationId);
    }
  }

  async function resolveConfirmation(
    confirmationId: string,
    approved: boolean,
  ): Promise<RcipInvocationOutcome> {
    const pending = confirmations.get(confirmationId);
    confirmations.delete(confirmationId);

    if (!pending) {
      return failedOutcome(
        createId("invocation"),
        "unknown",
        "CONFIRMATION_NOT_FOUND",
        "The confirmation request no longer exists.",
      );
    }

    if (!approved) {
      const outcome = failedOutcome(
        pending.invocationId,
        pending.request.capabilityId,
        "CONFIRMATION_DECLINED",
        "The user declined the requested operation.",
        "denied",
      );
      emit({
        timestamp: Date.now(),
        invocationId: pending.invocationId,
        capabilityId: pending.request.capabilityId,
        phase: "confirmation_declined",
        errorCode: "CONFIRMATION_DECLINED",
      });
      return outcome;
    }

    if (Date.now() > pending.expiresAt) {
      const outcome = failedOutcome(
        pending.invocationId,
        pending.request.capabilityId,
        "CONFIRMATION_EXPIRED",
        "The confirmation request expired.",
      );
      emitOutcome(outcome);
      return outcome;
    }

    return executeInvocation(pending.request, true, pending.invocationId);
  }

  const client: RcipClient = {
    getSnapshot: () => snapshot,
    listCapabilities(filter: RcipCapabilityFilter = {}) {
      return snapshot.capabilities.filter((capability) => {
        if (
          filter.context === "current" &&
          capability.relevance !== "current"
        ) {
          return false;
        }
        if (filter.availableOnly && !capability.available) return false;
        if (filter.scopeId && !capability.scopeIds.includes(filter.scopeId)) {
          return false;
        }
        if (filter.effect && capability.effect !== filter.effect) return false;
        return true;
      });
    },
    invoke: (request) => executeInvocation(request, false),
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  const host: RcipHostController = {
    bindCapability(definitionToBind, binding) {
      const catalogDefinition = definitions.get(definitionToBind.id);
      if (!catalogDefinition || catalogDefinition !== definitionToBind) {
        throw new Error(
          `Capability ${definitionToBind.id} is not the registered catalog definition.`,
        );
      }
      if (bindings.has(definitionToBind.id)) {
        throw new Error(`Capability ${definitionToBind.id} is already bound.`);
      }
      const internalBinding = makeBinding(ajv, definitionToBind, binding);
      bindings.set(definitionToBind.id, internalBinding);
      refresh();
      return () => {
        if (bindings.get(definitionToBind.id) === internalBinding) {
          bindings.delete(definitionToBind.id);
          refresh();
        }
      };
    },
    refresh,
    resolveConfirmation,
    setContext(context) {
      const activeScopeIds = [...new Set(context.activeScopeIds)];
      for (const scopeId of activeScopeIds) {
        if (!scopeIds.has(scopeId)) {
          throw new Error(`Unknown RCIP scope id: ${scopeId}`);
        }
      }
      if (
        context.primaryScopeId &&
        !activeScopeIds.includes(context.primaryScopeId)
      ) {
        throw new Error("The primary RCIP scope must also be active.");
      }
      semanticContext = {
        activeScopeIds,
        primaryScopeId: context.primaryScopeId,
      };
      refresh();
    },
  };

  snapshot = buildSnapshot();
  return { client, host };
}
