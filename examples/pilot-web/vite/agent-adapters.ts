import type {
  RcipCapabilitySnapshot,
  RcipInvocationOutcome,
  RcipJsonObject,
  RcipJsonValue,
} from '@binaried/rcip/core'

import type {
  PilotAgentAdapter,
  PilotAgentCall,
  PilotAgentDecision,
  PilotAgentRequest,
  PilotAgentStep,
} from '../src/agent-contract'

interface PilotAgentEnvironment {
  readonly OPENAI_API_KEY?: string
  readonly OPENAI_BASE_URL?: string
  readonly OPENAI_MODEL?: string
  readonly RCIP_AGENT_PROVIDER?: string
}

function isJsonObject(value: unknown): value is RcipJsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function extractQuotedOrTail(message: string, prefix: RegExp): string {
  const quoted = message.match(/["“”']([^"“”']+)["“”']/)?.[1]
  if (quoted) return quoted.trim()
  return message.replace(prefix, '').replace(/\s+as completed\.?$/i, '').trim()
}

function lastStep(request: PilotAgentRequest): PilotAgentStep | undefined {
  return request.steps.at(-1)
}

function succeededOutput(
  outcome: RcipInvocationOutcome,
): RcipJsonValue | undefined {
  return outcome.status === 'succeeded' ? outcome.output : undefined
}

function outcomeFailureMessage(outcome: RcipInvocationOutcome): string | null {
  if (outcome.status === 'succeeded') return null
  if (outcome.status === 'confirmation_required') {
    return 'The application is still waiting for confirmation.'
  }
  if (outcome.error.code === 'CONFIRMATION_DECLINED') {
    return 'Okay, I cancelled that operation and made no change.'
  }
  return `I could not complete that request: ${outcome.error.message}`
}

function call(
  capabilityId: string,
  input: RcipJsonValue,
  suffix: string,
): PilotAgentDecision {
  return {
    adapter: 'deterministic',
    type: 'calls',
    calls: [
      {
        callId: `fallback-${suffix}`,
        capabilityId,
        input,
      },
    ],
  }
}

class DeterministicPilotAdapter implements PilotAgentAdapter {
  async decide(request: PilotAgentRequest): Promise<PilotAgentDecision> {
    const latest = lastStep(request)
    if (latest) {
      const failure = outcomeFailureMessage(latest.outcome)
      if (failure) {
        return { adapter: 'deterministic', type: 'message', message: failure }
      }

      if (latest.call.capabilityId === 'todos.search') {
        const output = succeededOutput(latest.outcome)
        const items = isJsonObject(output) ? output.items : undefined
        if (!Array.isArray(items) || items.length === 0) {
          return {
            adapter: 'deterministic',
            type: 'message',
            message: 'I could not find a matching todo, so I made no change.',
          }
        }
        if (items.length > 1) {
          return {
            adapter: 'deterministic',
            type: 'message',
            message:
              'I found more than one matching todo. Please clarify which one you mean.',
          }
        }
        const item = items[0]
        if (!isJsonObject(item) || typeof item.id !== 'string') {
          return {
            adapter: 'deterministic',
            type: 'message',
            message: 'The matching todo did not provide a usable identifier.',
          }
        }
        const destructive = /\b(delete|remove)\b/i.test(request.message)
        return call(
          destructive ? 'todos.delete' : 'todos.complete',
          { id: item.id },
          destructive ? 'delete' : 'complete',
        )
      }

      const successMessages: Record<string, string> = {
        'profile.update': 'Your display name has been updated.',
        'profile.view': 'I retrieved your profile.',
        'todos.complete': 'The todo is now completed.',
        'todos.create': 'The new todo has been added.',
        'todos.delete': 'The todo has been deleted.',
        'todos.list': 'I retrieved your current todos.',
      }
      return {
        adapter: 'deterministic',
        type: 'message',
        message:
          successMessages[latest.call.capabilityId] ??
          'The capability completed successfully.',
      }
    }

    const message = request.message.trim()
    if (/^(add|create)\b/i.test(message) && /todo|task/i.test(message)) {
      const title = extractQuotedOrTail(
        message,
        /^(add|create)\s+(a\s+)?(new\s+)?(todo|task)?\s*/i,
      ).replace(/\s+to my todos?\.?$/i, '')
      return title
        ? call('todos.create', { title }, 'create')
        : {
            adapter: 'deterministic',
            type: 'message',
            message: 'What title should I use for the new todo?',
          }
    }

    if (/\b(complete|mark)\b/i.test(message)) {
      const query = extractQuotedOrTail(
        message,
        /^(mark|complete)\s+(my\s+)?/i,
      )
      return query
        ? call('todos.search', { query }, 'search-complete')
        : {
            adapter: 'deterministic',
            type: 'message',
            message: 'Which todo should I complete?',
          }
    }

    if (/\b(delete|remove)\b/i.test(message)) {
      const query = extractQuotedOrTail(
        message,
        /^(delete|remove)\s+(my\s+)?/i,
      )
      return query
        ? call('todos.search', { query }, 'search-delete')
        : {
            adapter: 'deterministic',
            type: 'message',
            message: 'Which todo should I delete?',
          }
    }

    const displayNameMatch = message.match(
      /(?:change|update)\s+(?:my\s+)?display name\s+to\s+(.+)$/i,
    )
    if (displayNameMatch?.[1]) {
      return call(
        'profile.update',
        { displayName: displayNameMatch[1].trim() },
        'profile-update',
      )
    }

    if (/\b(list|show)\b.*\btodos?\b/i.test(message)) {
      return call('todos.list', {}, 'list')
    }
    if (/\b(show|view)\b.*\bprofile\b/i.test(message)) {
      return call('profile.view', {}, 'profile-view')
    }

    return {
      adapter: 'deterministic',
      type: 'message',
      message:
        'Try asking me to add, complete, or delete a todo, or update your display name.',
    }
  }
}

interface OpenAiToolMapEntry {
  readonly capability: RcipCapabilitySnapshot
  readonly toolName: string
}

function toolNameFor(capabilityId: string): string {
  return `rcip_${capabilityId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function jsonFromText(value: string): RcipJsonValue {
  return JSON.parse(value)
}

function toolEntries(
  request: PilotAgentRequest,
): readonly OpenAiToolMapEntry[] {
  return request.snapshot.capabilities
    .filter((capability) => capability.available)
    .map((capability) => ({
      capability,
      toolName: toolNameFor(capability.id),
    }))
}

function stepsForModel(steps: readonly PilotAgentStep[]): string {
  if (steps.length === 0) return 'No capability has been called yet.'
  return JSON.stringify(
    steps.map((step) => ({
      capabilityId: step.call.capabilityId,
      input: step.call.input,
      outcome: step.outcome,
    })),
  )
}

function parseOpenAiDecision(
  payload: unknown,
  entries: readonly OpenAiToolMapEntry[],
): PilotAgentDecision {
  if (!isJsonObject(payload) || !Array.isArray(payload.output)) {
    throw new Error('OpenAI returned an invalid response envelope.')
  }

  const calls: PilotAgentCall[] = []
  const messages: string[] = []
  for (const item of payload.output) {
    if (!isJsonObject(item)) continue
    if (
      item.type === 'function_call' &&
      typeof item.name === 'string' &&
      typeof item.arguments === 'string'
    ) {
      const entry = entries.find((candidate) => candidate.toolName === item.name)
      if (!entry) continue
      calls.push({
        callId: typeof item.call_id === 'string' ? item.call_id : item.name,
        capabilityId: entry.capability.id,
        input: jsonFromText(item.arguments),
      })
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

  if (calls.length > 0) {
    return { adapter: 'openai', type: 'calls', calls: [calls[0]] }
  }
  return {
    adapter: 'openai',
    type: 'message',
    message: messages.join('\n').trim() || 'I could not map that request safely.',
  }
}

class OpenAiPilotAdapter implements PilotAgentAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
  ) {}

  async decide(request: PilotAgentRequest): Promise<PilotAgentDecision> {
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
          'You are the embedded delegate for an RCIP pilot. Use only the supplied semantic capabilities. Prefer read capabilities when identity is ambiguous. Never invent identifiers. After a capability result, either call the next necessary capability or explain the result concisely. The host application validates and authorizes every call.',
        input: [
          {
            role: 'user',
            content: `User request: ${request.message}\nCurrent semantic scope: ${request.snapshot.context.primaryScopeId ?? 'none'}\nPrior capability results: ${stepsForModel(request.steps)}`,
          },
        ],
        parallel_tool_calls: false,
        tools: entries.map(({ capability, toolName }) => ({
          type: 'function',
          name: toolName,
          description: `${capability.title}: ${capability.description}`,
          parameters: capability.inputSchema,
          strict: true,
        })),
      }),
    })
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`)
    }
    const payload: unknown = await response.json()
    return parseOpenAiDecision(payload, entries)
  }
}

export function createPilotAgentAdapter(
  environment: PilotAgentEnvironment,
): PilotAgentAdapter {
  const provider = environment.RCIP_AGENT_PROVIDER?.trim().toLowerCase() ?? 'auto'
  const apiKey = environment.OPENAI_API_KEY?.trim()
  const model = environment.OPENAI_MODEL?.trim()
  const useOpenAi = provider === 'openai' || (provider === 'auto' && apiKey && model)

  if (useOpenAi && apiKey && model) {
    const openAi = new OpenAiPilotAdapter(
      apiKey,
      model,
      environment.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
    )
    const fallback = new DeterministicPilotAdapter()
    return {
      async decide(request) {
        try {
          return await openAi.decide(request)
        } catch {
          return fallback.decide(request)
        }
      },
    }
  }

  return new DeterministicPilotAdapter()
}
