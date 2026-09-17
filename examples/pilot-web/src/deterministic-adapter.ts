import type {
  RcipAssistAction,
  RcipAssistCallbackContext,
} from '@binaried/rcip/assist'
import type { RcipInvocationOutcome, RcipJsonValue } from '@binaried/rcip/core'
import type {
  PilotAgentAdapter,
  PilotAgentDecision,
  PilotAgentRequest,
  PilotAgentStep,
} from './agent-contract'

const PILOT_TODO_IDS: Readonly<Record<string, string>> = {
  'review security policy': 'todo-2',
  'submit expense report': 'todo-1',
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
  return message
    .replace(prefix, '')
    .replace(/\s+to my todos?\.?$/i, '')
    .trim()
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

export class DeterministicPilotAdapter implements PilotAgentAdapter {
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
        return {
          message: 'What title should I use for the new todo?',
          type: 'message',
        }
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
          message:
            'I found more than one matching todo. Please clarify which one you mean.',
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
