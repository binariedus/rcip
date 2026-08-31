import type {
  RcipApplicationDefinition,
  RcipCapabilityDefinition,
  RcipJsonValue,
  RcipScopeDefinition,
} from './types'

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

/** Creates an immutable semantic scope definition. */
export function defineRcipScope(
  definition: RcipScopeDefinition,
): RcipScopeDefinition {
  return Object.freeze({ ...definition })
}

/** Creates an immutable, typed capability contract. */
export function defineRcipCapability<
  Input extends RcipJsonValue,
  Output extends RcipJsonValue,
>(
  definition: RcipCapabilityDefinition<Input, Output>,
): RcipCapabilityDefinition<Input, Output> {
  return Object.freeze({
    ...definition,
    scopeIds: freezeArray(definition.scopeIds),
    tags: definition.tags ? freezeArray(definition.tags) : undefined,
    usage: definition.usage
      ? Object.freeze({
          ...definition.usage,
          examples: definition.usage.examples
            ? freezeArray(
                definition.usage.examples.map((example) =>
                  Object.freeze({ ...example }),
                ),
              )
            : undefined,
        })
      : undefined,
  })
}

/** Creates an immutable application catalog for one protocol version. */
export function defineRcipApplication(
  definition: RcipApplicationDefinition,
): RcipApplicationDefinition {
  return Object.freeze({
    ...definition,
    application: Object.freeze({ ...definition.application }),
    scopes: freezeArray(definition.scopes),
    capabilities: freezeArray(definition.capabilities),
  })
}
