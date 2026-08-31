import type {
  RcipAssistAction,
  RcipAssistCallbackContext,
} from '@binaried/rcip/assist'
import type {
  RcipCapabilitySnapshot,
  RcipInvocationOutcome,
  RcipJsonObject,
  RcipJsonValue,
} from '@binaried/rcip/core'

import type {
  PilotAgentAdapter,
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

interface OpenAiToolMapEntry {
  readonly capability: RcipCapabilitySnapshot
  readonly toolName: string
}

const PILOT_TODO_IDS: Readonly<Record<string, string>> = {
  'review security policy': 'todo-2',
  'submit expense report': 'todo-1',
}

function isJsonObject(value: unknown): value is RcipJsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function latestUserMessage(request: PilotAgentRequest): string {
  return (
    [...request.messages]
      .reverse()
      .find((message) => message.role === 'user')
      ?.content.trim() ?? ''
  )
}

function extractQuotedOrTail(message: string, prefix: RegExp): string {
  const quoted = message.match(/["“”']([^"“”']+)["“”']/)?.[1]
  if (quoted) return quoted.trim()
  return message.replace(prefix, '').replace(/\s+to my todos?\.?$/i, '').trim()
}

function action(
  capabilityId: string,
  input: RcipJsonValue,
  id: string,
  delayAfter: RcipAssistAction['delayAfter'] = 'short',
): RcipAssistAction {
  return { capabilityId, delayAfter, id, input }
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

function deterministicSummary(steps: readonly PilotAgentStep[]): string {
  const failed = steps.find((step) => step.outcome.status !== 'succeeded')
  if (failed) {
    return (
      outcomeFailureMessage(failed.outcome) ??
      'The requested capability did not complete.'
    )
  }
  const labels: Readonly<Record<string, string>> = {
    'profile.update': 'Your display name has been updated.',
    'profile.view': 'I retrieved your profile.',
    'todos.complete': 'The todo is now completed.',
    'todos.create': 'The new todo has been added.',
    'todos.delete': 'The todo has been deleted.',
    'todos.list': 'I retrieved your current todos.',
  }
  if (steps.length === 1) {
    return (
      labels[steps[0]?.action.capabilityId ?? ''] ??
      'The capability completed successfully.'
    )
  }
  return `${String(steps.length)} requested actions completed successfully.`
}

class DeterministicPilotAdapter implements PilotAgentAdapter {
  async decide(
    request: PilotAgentRequest,
    context: RcipAssistCallbackContext,
  ): Promise<PilotAgentDecision> {
    void context
    if (request.phase === 'summarize') {
      return {
        message: deterministicSummary(request.steps),
        type: 'message',
      }
    }

    const message = latestUserMessage(request)
    const normalized = message.toLowerCase()
    if (/^(add|create)\b/i.test(message) && /todo|task/i.test(message)) {
      const title = extractQuotedOrTail(
        message,
        /^(add|create)\s+(a\s+)?(new\s+)?(todo|task)?\s*/i,
      )
      if (!title) {
        return { message: 'What title should I use for the new todo?', type: 'message' }
      }
      const actions: RcipAssistAction[] = [
        action('todos.create', { title }, 'fallback-create'),
      ]
      if (/\b(show|view)\b.*\bprofile\b/i.test(message)) {
        actions.push(action('profile.view', {}, 'fallback-profile', 'medium'))
      }
      return { actions, type: 'actions' }
    }

    const displayNameMatch = message.match(
      /(?:change|update)\s+(?:my\s+)?display name\s+to\s+(.+)$/i,
    )
    if (displayNameMatch?.[1]) {
      return {
        actions: [
          action(
            'profile.update',
            { displayName: displayNameMatch[1].trim() },
            'fallback-profile-update',
          ),
        ],
        type: 'actions',
      }
    }

    if (/\b(list|show)\b.*\btodos?\b/i.test(message)) {
      return {
        actions: [action('todos.list', {}, 'fallback-list')],
        type: 'actions',
      }
    }
    if (/\b(show|view)\b.*\bprofile\b/i.test(message)) {
      return {
        actions: [action('profile.view', {}, 'fallback-profile-view')],
        type: 'actions',
      }
    }

    if (/\b(complete|mark|delete|remove)\b/i.test(message)) {
      const title = extractQuotedOrTail(
        message,
        /^(mark|complete|delete|remove)\s+(my\s+)?/i,
      ).replace(/\s+as completed\.?$/i, '')
      if (title.toLowerCase() === 'prepare pilot report') {
        return {
          message: 'I found more than one matching todo. Please clarify which one you mean.',
          type: 'message',
        }
      }
      const id = PILOT_TODO_IDS[title.toLowerCase()]
      if (!id) {
        return {
          message: 'I could not safely identify one matching todo.',
          type: 'message',
        }
      }
      const destructive = /\b(delete|remove)\b/i.test(normalized)
      return {
        actions: [
          action(
            destructive ? 'todos.delete' : 'todos.complete',
            { id },
            destructive ? 'fallback-delete' : 'fallback-complete',
          ),
        ],
        type: 'actions',
      }
    }

    return {
      message:
        'I can add, complete, or delete a todo, list todos, or update your display name.',
      type: 'message',
    }
  }
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
