import { createRcipRuntime, type RcipRuntimeEvent } from '@binaried/rcip/core'

import { pilotDefinition } from './capabilities'

export function createPilotRuntime(
  onEvent: (event: RcipRuntimeEvent) => void,
) {
  return createRcipRuntime(pilotDefinition, {
    onEvent,
    policy({ capability, confirmed }) {
      if (capability.effect === 'read' || confirmed) {
        return { decision: 'allow' }
      }
      return {
        decision: 'confirm',
        reason:
          capability.effect === 'destructive'
            ? 'This operation permanently removes application data.'
            : 'Review this state-changing operation before it runs.',
      }
    },
  })
}
