import { DeterministicPilotAdapter } from '../src/deterministic-adapter'
import type {
  RcipAssistAction,
  RcipAssistCallbackContext,
} from '@binaried/rcip/assist'
import type {
  RcipCapabilitySnapshot,
  RcipJsonObject,
  RcipJsonValue,
} from '@binaried/rcip/core'

import type {
  PilotAgentAdapter,
  PilotAgentDecision,
  PilotAgentRequest,
} from '../src/agent-contract'

interface PilotAgentEnvironment {
  readonly OPENAI_API_KEY?: string
  readonly OPENAI_BASE_URL?: string
  readonly OPENAI_MODEL?: string
  readonly RCIP_AGENT_PROVIDER?: string
}

interface OpenAiToolMapEntry {
  readonly capability: RcipCapabilitySnapshot
  readonly toolName: string
}

function isJsonObject(value: unknown): value is RcipJsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function action(capabilityId: string, input: RcipJsonValue, id: string): RcipAssistAction {
  return { capabilityId, input, id, delayAfter: 'short' }
}

function toolNameFor(capabilityId: string): string {
  return `rcip_${capabilityId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function toolEntries(request: PilotAgentRequest): readonly OpenAiToolMapEntry[] {
  return request.snapshot.capabilities
    .filter((capability) => capability.available)
    .map((capability) => ({
      capability,
      toolName: toolNameFor(capability.id),
    }))
}

function parseJson(value: string): RcipJsonValue {
  return JSON.parse(value)
}

function parseOpenAiDecision(
  payload: unknown,
  entries: readonly OpenAiToolMapEntry[],
): PilotAgentDecision {
  if (!isJsonObject(payload) || !Array.isArray(payload.output)) {
    throw new Error('OpenAI returned an invalid response envelope.')
  }
  const actions: RcipAssistAction[] = []
  const messages: string[] = []
  for (const item of payload.output) {
    if (!isJsonObject(item)) continue
    if (
      item.type === 'function_call' &&
      typeof item.name === 'string' &&
      typeof item.arguments === 'string'
    ) {
      const entry = entries.find((candidate) => candidate.toolName === item.name)
      if (entry) {
        actions.push(
          action(
            entry.capability.id,
            parseJson(item.arguments),
            typeof item.call_id === 'string' ? item.call_id : item.name,
          ),
        )
      }
    }
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (
          isJsonObject(content) &&
          content.type === 'output_text' &&
          typeof content.text === 'string'
        ) {
          messages.push(content.text)
        }
      }
    }
  }
  if (actions.length > 0) return { actions, type: 'actions' }
  return {
    message: messages.join('\n').trim() || 'I could not map that request safely.',
    type: 'message',
  }
}

class OpenAiPilotAdapter implements PilotAgentAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
  ) {}

  async decide(
    request: PilotAgentRequest,
    context: RcipAssistCallbackContext,
  ): Promise<PilotAgentDecision> {
    const entries = toolEntries(request)
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions:
          request.phase === 'summarize'
            ? 'Summarize the supplied RCIP action outcomes concisely. Do not propose or imply another action.'
            : 'You are the embedded assistant for an RCIP pilot. Return at most one bounded batch using only supplied capabilities. The host validates, authorizes, and may confirm every action.',
        input: [
          {
            role: 'user',
            content: JSON.stringify({
              conversation: request.messages,
              currentScope: request.snapshot.context.primaryScopeId ?? null,
              phase: request.phase,
              steps: request.steps,
            }),
          },
        ],
        parallel_tool_calls: false,
        ...(request.phase === 'decide'
          ? {
              tools: entries.map(({ capability, toolName }) => ({
                description: [
                  `${capability.title}: ${capability.description}`,
                  capability.usage?.whenToUse,
                ]
                  .filter(Boolean)
                  .join(' '),
                name: toolName,
                parameters: capability.inputSchema,
                strict: true,
                type: 'function',
              })),
            }
          : {}),
      }),
      signal: context.signal,
    })
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`)
    }
    const decision = parseOpenAiDecision(await response.json(), entries)
    if (request.phase === 'summarize' && decision.type !== 'message') {
      throw new Error('OpenAI returned actions during summarization.')
    }
    return decision
  }
}

export function createPilotAgentAdapter(
  environment: PilotAgentEnvironment,
): PilotAgentAdapter {
  const provider = environment.RCIP_AGENT_PROVIDER?.trim().toLowerCase() ?? 'auto'
  const apiKey = environment.OPENAI_API_KEY?.trim()
  const model = environment.OPENAI_MODEL?.trim()
  const useOpenAi = provider === 'openai' || (provider === 'auto' && apiKey && model)
  const fallback = new DeterministicPilotAdapter()

  if (useOpenAi && apiKey && model) {
    const openAi = new OpenAiPilotAdapter(
      apiKey,
      model,
      environment.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
    )
    return {
      async decide(request, context) {
        try {
          return await openAi.decide(request, context)
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') throw error
          return fallback.decide(request, context)
        }
      },
    }
  }

  return fallback
}
