import type {
  RcipAssistDecide,
  RcipAssistRequest,
  RcipAssistResponse,
} from '@binaried/rcip/assist'

export const pilotAssistDecide: RcipAssistDecide = async (
  request: RcipAssistRequest,
  { signal },
): Promise<RcipAssistResponse> => {
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
