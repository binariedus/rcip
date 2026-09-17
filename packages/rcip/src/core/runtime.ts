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

import { copyJson, immutableCopy } from "./values";

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
  readonly binding: InternalBinding;
  readonly context: RcipSemanticContext;
  readonly cleanup: () => void;
}

const DEFAULT_CONFIRMATION_TTL_MS = 120_000;
const IDENTIFIER_PATTERN = /^[a-z][A-Za-z0-9]*(?:[._-][a-z][A-Za-z0-9]*)*$/;
let fallbackIdSequence = 0;

function waitForPolicy(
  decision: RcipPolicyDecision | Promise<RcipPolicyDecision>,
  signal?: AbortSignal,
): Promise<RcipPolicyDecision> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(new Error("Policy wait cancelled."));
    };
    const cleanup = () => signal?.removeEventListener("abort", abort);
    Promise.resolve(decision).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

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
    if (capability.usage && !capability.usage.whenToUse.trim()) {
      throw new Error(
        `RCIP capability ${capability.id} has empty usage guidance.`,
      );
    }
    for (const scopeId of capability.scopeIds) {
      if (!scopeIds.has(scopeId)) {
        throw new Error(
          `RCIP capability ${capability.id} references missing scope ${scopeId}`,
        );
      }
    }
  }
}

function compileSchema<Value extends RcipJsonValue>(
  ajv: Ajv2020,
  cache: Map<string, ValidateFunction>,
  schema: RcipCapabilityDefinition["inputSchema"],
): ValidateFunction<Value> {
  const key = JSON.stringify(schema);
  const cached = cache.get(key);
  if (cached) return cached as ValidateFunction<Value>;
  const validator = ajv.compile<Value>(schema);
  cache.set(key, validator);
  return validator;
}

function makeBinding<Input extends RcipJsonValue, Output extends RcipJsonValue>(
  ajv: Ajv2020,
  cache: Map<string, ValidateFunction>,
  definition: RcipCapabilityDefinition<Input, Output>,
  binding: RcipCapabilityBinding<Input, Output>,
): InternalBinding {
  const validateInput = compileSchema<Input>(
    ajv,
    cache,
    definition.inputSchema,
  );
  const validateOutput = compileSchema<Output>(
    ajv,
    cache,
    definition.outputSchema,
  );

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
  const catalogIdentities = new Map(
    definition.capabilities.map((capability) => [capability.id, capability]),
  );
  definition = immutableCopy(definition);

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const schemaCache = new Map<string, ValidateFunction>();
  const createId = options.createId ?? defaultCreateId;
  const confirmationTtlMs =
    options.confirmationTtlMs ?? DEFAULT_CONFIRMATION_TTL_MS;
  const definitions = new Map(
    definition.capabilities.map((capability) => [capability.id, capability]),
  );
  for (const capability of definition.capabilities) {
    if (!capability.usage?.examples) continue;
    const validateExample = compileSchema<RcipJsonValue>(
      ajv,
      schemaCache,
      capability.inputSchema,
    );
    for (const example of capability.usage.examples) {
      if (!example.description.trim() || !validateExample(example.input)) {
        throw new Error(
          `RCIP capability ${capability.id} has an invalid usage example.`,
        );
      }
    }
  }
  const scopeIds = new Set(definition.scopes.map((scope) => scope.id));
  const bindings = new Map<string, InternalBinding>();
  const confirmations = new Map<string, PendingConfirmation>();
  const activeInvocationIds = new Map<string, symbol>();
  const completedConfirmations = new Map<string, RcipInvocationFailed>();
  const subscribers = new Set<() => void>();
  let semanticContext: RcipSemanticContext = { activeScopeIds: [] };
  let revision = 0;
  let snapshot: RcipApplicationSnapshot;

  function sameContext(context: RcipSemanticContext): boolean {
    return (
      context.primaryScopeId === semanticContext.primaryScopeId &&
      context.activeScopeIds.length === semanticContext.activeScopeIds.length &&
      context.activeScopeIds.every(
        (id, index) => id === semanticContext.activeScopeIds[index],
      )
    );
  }

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
      usage: capability.usage
        ? {
            whenToUse: capability.usage.whenToUse,
            examples: capability.usage.examples?.map((example) => ({
              description: example.description,
              input: example.input,
            })),
          }
        : undefined,
      bound: Boolean(binding),
      available: Boolean(binding && availability?.available),
      availability,
      relevance: relevant ? "current" : "other",
    };
  }

  function buildSnapshot(): RcipApplicationSnapshot {
    return immutableCopy({
      protocolVersion: definition.protocolVersion,
      revision,
      application: { ...definition.application },
      scopes: definition.scopes.map((scope) => ({ ...scope })),
      context: {
        activeScopeIds: [...semanticContext.activeScopeIds],
        primaryScopeId: semanticContext.primaryScopeId,
      },
      capabilities: definition.capabilities.map(capabilitySnapshot),
    });
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
    suppliedRequest: RcipInvocationRequest,
    confirmed: boolean,
    fixedInvocationId?: string,
  ): Promise<RcipInvocationOutcome> {
    const invocationId =
      fixedInvocationId ??
      suppliedRequest.invocationId ??
      createId("invocation");
    const capabilityId = suppliedRequest.capabilityId;
    if (activeInvocationIds.has(invocationId)) {
      return failedOutcome(
        invocationId,
        capabilityId,
        "INVOCATION_ALREADY_ACTIVE",
        "An invocation with this id is already active.",
      );
    }
    const reservation = Symbol(invocationId);
    activeInvocationIds.set(invocationId, reservation);
    try {
      let request: RcipInvocationRequest;
      try {
        request = Object.freeze({
          capabilityId,
          invocationId,
          input: copyJson(suppliedRequest.input),
          signal: suppliedRequest.signal,
        });
      } catch {
        return failedOutcome(
          invocationId,
          capabilityId,
          "INPUT_INVALID",
          "The capability input must be a JSON value.",
        );
      }
      return await executeReservedInvocation(request, confirmed, invocationId);
    } finally {
      if (
        activeInvocationIds.get(invocationId) === reservation &&
        ![...confirmations.values()].some(
          (pending) => pending.invocationId === invocationId,
        )
      ) {
        activeInvocationIds.delete(invocationId);
      }
    }
  }

  async function executeReservedInvocation(
    request: RcipInvocationRequest,
    confirmed: boolean,
    invocationId: string,
  ): Promise<RcipInvocationOutcome> {
    const capabilityId = request.capabilityId;
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

    const policyContext = immutableCopy(semanticContext);
    const currentCapability = immutableCopy(capabilitySnapshot(capability));
    let policyDecision: RcipPolicyDecision;
    try {
      policyDecision = options.policy
        ? await waitForPolicy(
            options.policy({
              capability: currentCapability,
              input: immutableCopy(request.input),
              semanticContext: policyContext,
              confirmed,
            }),
            request.signal,
          )
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
        request.signal?.aborted
          ? "EXECUTION_ABORTED"
          : "POLICY_EVALUATION_FAILED",
        request.signal?.aborted
          ? "The capability invocation was cancelled."
          : "The host application could not evaluate this operation safely.",
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

    // Host callbacks may await navigation, permission changes, or an unmount.
    if (bindings.get(capabilityId) !== binding) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "CAPABILITY_UNBOUND",
        "The capability binding changed during policy evaluation.",
      );
      emitOutcome(outcome);
      return outcome;
    }
    if (!sameContext(policyContext)) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "POLICY_DENIED",
        "Application context changed. Request the operation again.",
        "denied",
      );
      emitOutcome(outcome);
      return outcome;
    }
    if (!safeAvailability(binding)?.available) {
      const outcome = failedOutcome(
        invocationId,
        capabilityId,
        "CAPABILITY_UNAVAILABLE",
        "The capability is no longer available.",
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
      const finishPending = (
        code: "CONFIRMATION_EXPIRED" | "EXECUTION_ABORTED",
      ) => {
        const pending = confirmations.get(confirmationId);
        if (!pending) return;
        pending.cleanup();
        confirmations.delete(confirmationId);
        activeInvocationIds.delete(invocationId);
        const outcome = failedOutcome(
          invocationId,
          capabilityId,
          code,
          code === "CONFIRMATION_EXPIRED"
            ? "The confirmation request expired."
            : "The capability invocation was cancelled.",
        );
        completedConfirmations.set(confirmationId, outcome);
        // Retain only bounded, non-sensitive receipts, never request payloads.
        if (completedConfirmations.size > 256) {
          const oldest = completedConfirmations.keys().next().value;
          if (oldest !== undefined) completedConfirmations.delete(oldest);
        }
        emitOutcome(outcome);
      };
      const timer = setTimeout(
        () => finishPending("CONFIRMATION_EXPIRED"),
        Math.max(0, confirmationTtlMs),
      );
      if (typeof timer === "object" && "unref" in timer) timer.unref();
      const abort = () => finishPending("EXECUTION_ABORTED");
      confirmations.set(confirmationId, {
        confirmationId,
        expiresAt,
        request,
        invocationId,
        binding,
        context: policyContext,
        cleanup: () => {
          clearTimeout(timer);
          request.signal?.removeEventListener("abort", abort);
        },
      });
      request.signal?.addEventListener("abort", abort, { once: true });
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

    emit({
      timestamp: Date.now(),
      invocationId,
      capabilityId,
      phase: "started",
    });

    try {
      const handlerOutput = await binding.execute(copyJson(request.input), {
        signal: request.signal,
        invocationId,
        requestedAt: Date.now(),
        semanticContext: policyContext,
      });
      let output: RcipJsonValue;
      try {
        output = copyJson(handlerOutput);
      } catch {
        const outcome = failedOutcome(
          invocationId,
          capabilityId,
          "OUTPUT_INVALID",
          "The capability output must be a JSON value.",
        );
        emitOutcome(outcome);
        return outcome;
      }
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
    }
  }

  async function resolveConfirmation(
    confirmationId: string,
    approved: boolean,
  ): Promise<RcipInvocationOutcome> {
    const pending = confirmations.get(confirmationId);
    confirmations.delete(confirmationId);
    pending?.cleanup();
    if (pending) activeInvocationIds.delete(pending.invocationId);

    if (!pending) {
      const completed = completedConfirmations.get(confirmationId);
      completedConfirmations.delete(confirmationId);
      if (completed) return completed;
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

    if (
      bindings.get(pending.request.capabilityId) !== pending.binding ||
      !sameContext(pending.context)
    ) {
      const outcome = failedOutcome(
        pending.invocationId,
        pending.request.capabilityId,
        "POLICY_DENIED",
        "The application changed while confirmation was pending. Request the operation again.",
        "denied",
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
      if (
        !catalogDefinition ||
        catalogIdentities.get(definitionToBind.id) !== definitionToBind
      ) {
        throw new Error(
          `Capability ${definitionToBind.id} is not the registered catalog definition.`,
        );
      }
      if (bindings.has(definitionToBind.id)) {
        throw new Error(`Capability ${definitionToBind.id} is already bound.`);
      }
      const internalBinding = makeBinding(
        ajv,
        schemaCache,
        {
          ...definitionToBind,
          inputSchema: catalogDefinition.inputSchema,
          outputSchema: catalogDefinition.outputSchema,
        },
        binding,
      );
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
