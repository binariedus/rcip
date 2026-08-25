import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import type { PilotAgentRequest } from '../src/agent-contract'
import { createPilotAgentAdapter } from './agent-adapters'

interface AgentPluginEnvironment {
  readonly [key: string]: string | undefined
  readonly OPENAI_API_KEY?: string
  readonly OPENAI_BASE_URL?: string
  readonly OPENAI_MODEL?: string
  readonly RCIP_AGENT_PROVIDER?: string
}

const MAX_REQUEST_BYTES = 512_000

async function readJsonBody(request: IncomingMessage): Promise<PilotAgentRequest> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > MAX_REQUEST_BYTES) throw new Error('Request body is too large.')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: object,
): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(payload))
}

export function pilotAgentPlugin(
  environment: AgentPluginEnvironment,
): Plugin {
  const adapter = createPilotAgentAdapter(environment)
  return {
    name: 'rcip-pilot-agent',
    configureServer(server) {
      server.middlewares.use('/api/agent/decide', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'method_not_allowed' })
          return
        }
        try {
          const decision = await adapter.decide(await readJsonBody(request))
          sendJson(response, 200, decision)
        } catch {
          sendJson(response, 400, { error: 'invalid_agent_request' })
        }
      })
    },
  }
}
