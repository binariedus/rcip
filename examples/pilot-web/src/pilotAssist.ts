import { DeterministicPilotAdapter } from './deterministic-adapter'
import type {
  RcipAssistDecide,
  RcipAssistRequest,
  RcipAssistResponse,
} from '@binaried/rcip/assist'

export const pilotAssistDecide: RcipAssistDecide = async (
  request: RcipAssistRequest,
  { signal },
): Promise<RcipAssistResponse> => {
  if (import.meta.env.VITE_RCIP_STATIC_DEMO === 'true') {
    return new DeterministicPilotAdapter().decide(request, { signal })
  }
  const response = await fetch('/api/agent/decide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) {
    throw new Error('The pilot assist endpoint is unavailable.')
  }
  return response.json()
}
