import {
  RCIP_PROTOCOL_VERSION,
  createRcipRuntime,
  defineRcipApplication,
  defineRcipCapability,
  type RcipErrorCode,
  type RcipInvocationOutcome,
  type RcipJsonSchema,
  type RcipRuntime,
} from "@binaried/rcip/core";

export interface ContractMatrixResult {
  readonly actual: string;
  readonly expected: string;
  readonly id: string;
  readonly passed: boolean;
  readonly title: string;
}

const emptySchema: RcipJsonSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

const validOutputSchema: RcipJsonSchema = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  additionalProperties: false,
};

const readCapability = defineRcipCapability<
  Record<string, never>,
  { ok: boolean }
>({
  id: "diagnostics.read",
  title: "Diagnostic read",
  description: "Exercise one isolated RCIP runtime contract.",
  scopeIds: [],
  effect: "read",
  inputSchema: emptySchema,
  outputSchema: validOutputSchema,
});

const writeCapability = defineRcipCapability<
  Record<string, never>,
  { ok: boolean }
>({
  ...readCapability,
  id: "diagnostics.prepareWrite",
  title: "Diagnostic write",
  effect: "write",
});

function createDiagnosticRuntime(
  capability = readCapability,
  options: Parameters<typeof createRcipRuntime>[1] = {},
): RcipRuntime {
  return createRcipRuntime(
    defineRcipApplication({
      protocolVersion: RCIP_PROTOCOL_VERSION,
      application: {
        id: "rcip.contract-diagnostics",
        name: "RCIP contract diagnostics",
        description: "Browser-driven runtime behavior checks.",
      },
      scopes: [],
      capabilities: [capability],
    }),
    options,
  );
}

function outcomeLabel(outcome: RcipInvocationOutcome): string {
  if (outcome.status === "succeeded") return outcome.status;
  if (outcome.status === "confirmation_required") return outcome.status;
  return outcome.error.code;
}

function result(
  id: string,
  title: string,
  expected: RcipErrorCode | RcipInvocationOutcome["status"],
  outcome: RcipInvocationOutcome,
): ContractMatrixResult {
  const actual = outcomeLabel(outcome);
  return { actual, expected, id, passed: actual === expected, title };
}

function bindSuccessfulRead(runtime: RcipRuntime): void {
  runtime.host.bindCapability(readCapability, {
    execute: () => ({ ok: true }),
  });
}

/** Runs isolated runtime safety paths from the browser reference application. */
export async function runContractMatrix(): Promise<
  readonly ContractMatrixResult[]
> {
  const checks: ContractMatrixResult[] = [];

  {
    const runtime = createDiagnosticRuntime();
    const outcome = await runtime.client.invoke({
      capabilityId: "diagnostics.missing",
      input: {},
    });
    checks.push(
      result(
        "not-found",
        "Unknown capability",
        "CAPABILITY_NOT_FOUND",
        outcome,
      ),
    );
  }

  {
    const runtime = createDiagnosticRuntime();
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(
      result("unbound", "Unbound capability", "CAPABILITY_UNBOUND", outcome),
    );
  }

  {
    const runtime = createDiagnosticRuntime();
    runtime.host.bindCapability(readCapability, {
      execute: () => ({ ok: true }),
      getAvailability: () => ({
        available: false,
        reasonCode: "DIAGNOSTIC_UNAVAILABLE",
        reason: "Unavailable for this contract check.",
      }),
    });
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(
      result(
        "unavailable",
        "Unavailable capability",
        "CAPABILITY_UNAVAILABLE",
        outcome,
      ),
    );
  }

  {
    const runtime = createDiagnosticRuntime();
    bindSuccessfulRead(runtime);
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: { unexpected: true },
    });
    checks.push(result("input", "Invalid input", "INPUT_INVALID", outcome));
  }

  {
    const runtime = createDiagnosticRuntime(readCapability, {
      policy: () => ({ decision: "deny", reason: "Diagnostic denial." }),
    });
    bindSuccessfulRead(runtime);
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(
      result("policy-denied", "Policy denial", "POLICY_DENIED", outcome),
    );
  }

  {
    const runtime = createDiagnosticRuntime(readCapability, {
      policy: () => {
        throw new Error("Diagnostic policy failure.");
      },
    });
    bindSuccessfulRead(runtime);
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(
      result(
        "policy-failure",
        "Policy callback failure",
        "POLICY_EVALUATION_FAILED",
        outcome,
      ),
    );
  }

  {
    const controller = new AbortController();
    controller.abort();
    const runtime = createDiagnosticRuntime();
    bindSuccessfulRead(runtime);
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
      signal: controller.signal,
    });
    checks.push(
      result("aborted", "Aborted invocation", "EXECUTION_ABORTED", outcome),
    );
  }

  {
    const runtime = createDiagnosticRuntime();
    runtime.host.bindCapability(readCapability, {
      execute: () => {
        throw new Error("Diagnostic execution failure.");
      },
    });
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(
      result("execution", "Execution failure", "EXECUTION_FAILED", outcome),
    );
  }

  {
    const runtime = createDiagnosticRuntime();
    runtime.host.bindCapability(readCapability, {
      execute: () => ({ ok: "not-a-boolean" }) as never,
    });
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(result("output", "Invalid output", "OUTPUT_INVALID", outcome));
  }

  {
    const runtime = createDiagnosticRuntime(writeCapability, {
      confirmationTtlMs: 1,
      policy: ({ confirmed }) =>
        confirmed ? { decision: "allow" } : { decision: "confirm" },
    });
    runtime.host.bindCapability(writeCapability, {
      execute: () => ({ ok: true }),
    });
    const requested = await runtime.client.invoke({
      capabilityId: writeCapability.id,
      input: {},
    });
    if (requested.status !== "confirmation_required") {
      checks.push(
        result(
          "confirmation-expired",
          "Expired confirmation",
          "CONFIRMATION_EXPIRED",
          requested,
        ),
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 5));
      checks.push(
        result(
          "confirmation-expired",
          "Expired confirmation",
          "CONFIRMATION_EXPIRED",
          await runtime.host.resolveConfirmation(
            requested.confirmation.id,
            true,
          ),
        ),
      );
    }
  }

  {
    const runtime = createDiagnosticRuntime();
    const outcome = await runtime.host.resolveConfirmation("missing", true);
    checks.push(
      result(
        "confirmation-missing",
        "Unknown confirmation",
        "CONFIRMATION_NOT_FOUND",
        outcome,
      ),
    );
  }

  {
    let releaseExecution: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseExecution = resolve;
    });
    const runtime = createDiagnosticRuntime();
    runtime.host.bindCapability(readCapability, {
      execute: async () => {
        await blocked;
        return { ok: true };
      },
    });
    const request = {
      capabilityId: readCapability.id,
      input: {},
      invocationId: "diagnostic-duplicate",
    } as const;
    const firstInvocation = runtime.client.invoke(request);
    const duplicate = await runtime.client.invoke(request);
    releaseExecution?.();
    await firstInvocation;
    checks.push(
      result(
        "duplicate",
        "Duplicate active invocation",
        "INVOCATION_ALREADY_ACTIVE",
        duplicate,
      ),
    );
  }

  {
    const runtime = createDiagnosticRuntime(readCapability, {
      onEvent: () => {
        throw new Error("Diagnostic observer failure.");
      },
    });
    bindSuccessfulRead(runtime);
    const outcome = await runtime.client.invoke({
      capabilityId: readCapability.id,
      input: {},
    });
    checks.push(
      result("observer", "Observer callback isolation", "succeeded", outcome),
    );
  }

  return checks;
}
