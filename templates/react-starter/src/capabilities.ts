import {
  RCIP_PROTOCOL_VERSION,
  defineRcipApplication,
  defineRcipCapability,
} from '@binaried/rcip/core'

const outputSchema = {
  type: 'object',
  properties: { count: { type: 'integer' } },
  required: ['count'],
  additionalProperties: false,
}

export const readCount = defineRcipCapability<Record<string, never>, { count: number }>({
  id: 'counter.read',
  title: 'Read count',
  description: 'Read the current counter value.',
  scopeIds: [],
  effect: 'read',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  outputSchema,
})

export const increment = defineRcipCapability<{ by: number }, { count: number }>({
  id: 'counter.increment',
  title: 'Increment count',
  description: 'Increment by one to three after application-owned approval.',
  scopeIds: [],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: { by: { type: 'integer', minimum: 1, maximum: 3 } },
    required: ['by'],
    additionalProperties: false,
  },
  outputSchema,
})

export const definition = defineRcipApplication({
  protocolVersion: RCIP_PROTOCOL_VERSION,
  application: {
    id: 'example.counter',
    name: 'React counter',
    description: 'Discover, read, and request a confirmed write.',
  },
  scopes: [],
  capabilities: [readCount, increment],
})
