import type { RcipJsonValue } from './types'

/** Copy JSON without coercing invalid values (NaN, undefined, cycles, classes). */
export function copyJson<T extends RcipJsonValue>(value: T): T {
  const ancestors = new Set<object>()
  function validate(candidate: unknown): void {
    if (
      candidate === null ||
      typeof candidate === 'string' ||
      typeof candidate === 'boolean'
    )
      return
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return
    if (typeof candidate !== 'object' || !candidate)
      throw new Error('Expected JSON.')
    if (ancestors.has(candidate)) throw new Error('Cyclic JSON.')
    if (
      !Array.isArray(candidate) &&
      Object.getPrototypeOf(candidate) !== Object.prototype &&
      Object.getPrototypeOf(candidate) !== null
    ) {
      throw new Error('Expected a JSON object.')
    }
    ancestors.add(candidate)
    for (const item of Array.isArray(candidate)
      ? candidate
      : Object.values(candidate))
      validate(item)
    ancestors.delete(candidate)
  }
  validate(value)
  return structuredClone(value)
}

/** Public metadata has no live objects; detach and freeze it recursively. */
export function immutableCopy<T>(value: T): T {
  function freeze(candidate: unknown): void {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Object.isFrozen(candidate)
    )
      return
    for (const child of Object.values(candidate)) freeze(child)
    Object.freeze(candidate)
  }
  const copy = structuredClone(value)
  freeze(copy)
  return copy
}
