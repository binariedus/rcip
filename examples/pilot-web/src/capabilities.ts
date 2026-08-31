import {
  defineRcipApplication,
  defineRcipCapability,
  defineRcipScope,
} from '@binaried/rcip/core'

export type Todo = {
  completed: boolean
  id: string
  title: string
}

export type TodoListOutput = { items: Todo[] }
export type TodoSearchInput = { query: string }
export type TodoCreateInput = { title: string }
export type TodoIdInput = { id: string }
export type TodoDeleteOutput = { deletedId: string }
export type Profile = { displayName: string; email: string }
export type ProfileUpdateInput = { displayName: string }
export type EmptyInput = Record<string, never>

const emptyInputSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
}

const todoSchema = {
  type: 'object',
  properties: {
    completed: { description: 'Whether the todo is completed.', type: 'boolean' },
    id: { description: 'Stable todo identifier.', type: 'string' },
    title: { description: 'User-visible todo title.', type: 'string' },
  },
  required: ['completed', 'id', 'title'],
  additionalProperties: false,
}

const todoListSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: todoSchema },
  },
  required: ['items'],
  additionalProperties: false,
}

export const todoScope = defineRcipScope({
  id: 'todos',
  title: 'Todos',
  description: 'The user’s tasks and task-management workflows.',
})

export const profileScope = defineRcipScope({
  id: 'profile',
  title: 'Profile',
  description: 'The signed-in user’s visible profile information.',
})

export const listTodosCapability = defineRcipCapability<
  EmptyInput,
  TodoListOutput
>({
  id: 'todos.list',
  title: 'List todos',
  description: 'Return the user’s current todo items.',
  scopeIds: [todoScope.id],
  effect: 'read',
  inputSchema: emptyInputSchema,
  outputSchema: todoListSchema,
  tags: ['todo', 'read'],
  usage: {
    whenToUse: 'Use when the user wants to see all current todo items.',
    examples: [{ description: 'List every todo.', input: {} }],
  },
})

export const searchTodosCapability = defineRcipCapability<
  TodoSearchInput,
  TodoListOutput
>({
  id: 'todos.search',
  title: 'Search todos',
  description: 'Find todo items whose titles contain a phrase.',
  scopeIds: [todoScope.id],
  effect: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        description: 'Case-insensitive phrase to find in todo titles.',
        type: 'string',
        minLength: 1,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: todoListSchema,
  tags: ['todo', 'search'],
  usage: {
    whenToUse: 'Use to find todos by a title phrase before presenting matches.',
    examples: [
      { description: 'Find expense-related todos.', input: { query: 'expense' } },
    ],
  },
})

export const createTodoCapability = defineRcipCapability<
  TodoCreateInput,
  Todo
>({
  id: 'todos.create',
  title: 'Add todo',
  description: 'Create a new todo item with the supplied title.',
  scopeIds: [todoScope.id],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        description: 'Title of the new todo item.',
        type: 'string',
        minLength: 1,
        maxLength: 160,
      },
    },
    required: ['title'],
    additionalProperties: false,
  },
  outputSchema: todoSchema,
  tags: ['todo', 'create'],
  usage: {
    whenToUse: 'Use when the user explicitly asks to add a new todo.',
    examples: [
      {
        description: 'Add a travel reminder.',
        input: { title: 'Book flight tickets' },
      },
    ],
  },
})

export const completeTodoCapability = defineRcipCapability<TodoIdInput, Todo>({
  id: 'todos.complete',
  title: 'Complete todo',
  description: 'Mark one existing todo item as completed.',
  scopeIds: [todoScope.id],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Stable identifier of the todo to complete.',
        type: 'string',
        minLength: 1,
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  outputSchema: todoSchema,
  tags: ['todo', 'complete'],
  usage: {
    whenToUse: 'Use only when one exact todo identifier is already known.',
    examples: [
      { description: 'Complete the first pilot todo.', input: { id: 'todo-1' } },
    ],
  },
})

export const deleteTodoCapability = defineRcipCapability<
  TodoIdInput,
  TodoDeleteOutput
>({
  id: 'todos.delete',
  title: 'Delete todo',
  description: 'Permanently remove one todo item.',
  scopeIds: [todoScope.id],
  effect: 'destructive',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        description: 'Stable identifier of the todo to permanently delete.',
        type: 'string',
        minLength: 1,
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: { deletedId: { type: 'string' } },
    required: ['deletedId'],
    additionalProperties: false,
  },
  tags: ['todo', 'delete'],
  usage: {
    whenToUse: 'Use only after one exact todo is identified for deletion.',
    examples: [
      { description: 'Delete the second pilot todo.', input: { id: 'todo-2' } },
    ],
  },
})

export const viewProfileCapability = defineRcipCapability<EmptyInput, Profile>({
  id: 'profile.view',
  title: 'View profile',
  description: 'Return the signed-in user’s visible profile details.',
  scopeIds: [profileScope.id],
  effect: 'read',
  inputSchema: emptyInputSchema,
  outputSchema: {
    type: 'object',
    properties: {
      displayName: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['displayName', 'email'],
    additionalProperties: false,
  },
  tags: ['profile', 'read'],
  usage: {
    whenToUse: 'Use when the user asks to view their current profile.',
    examples: [{ description: 'View the signed-in profile.', input: {} }],
  },
})

export const updateProfileCapability = defineRcipCapability<
  ProfileUpdateInput,
  Profile
>({
  id: 'profile.update',
  title: 'Update profile',
  description: 'Change the signed-in user’s display name.',
  scopeIds: [profileScope.id],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: {
      displayName: {
        description: 'New user-visible display name.',
        type: 'string',
        minLength: 1,
        maxLength: 80,
      },
    },
    required: ['displayName'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      displayName: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['displayName', 'email'],
    additionalProperties: false,
  },
  tags: ['profile', 'update'],
  usage: {
    whenToUse: 'Use when the user explicitly requests a display-name change.',
    examples: [
      {
        description: 'Change the display name.',
        input: { displayName: 'Alex Morgan' },
      },
    ],
  },
})

export const exportProfileCapability = defineRcipCapability<
  EmptyInput,
  { downloadUrl: string }
>({
  id: 'profile.export',
  title: 'Export profile',
  description: 'Export profile data. This pilot advertises but does not bind it.',
  scopeIds: [profileScope.id],
  effect: 'external',
  inputSchema: emptyInputSchema,
  outputSchema: {
    type: 'object',
    properties: { downloadUrl: { type: 'string' } },
    required: ['downloadUrl'],
    additionalProperties: false,
  },
  tags: ['profile', 'export'],
  usage: {
    whenToUse: 'Use when profile export is connected and explicitly requested.',
    examples: [{ description: 'Export the profile.', input: {} }],
  },
})

export const pilotDefinition = defineRcipApplication({
  protocolVersion: '1.0',
  application: {
    id: 'rcip.pilot',
    name: 'RCIP Pilot',
    description:
      'A todo and profile application that exposes semantic capabilities.',
    version: '0.1.0',
  },
  scopes: [todoScope, profileScope],
  capabilities: [
    listTodosCapability,
    searchTodosCapability,
    createTodoCapability,
    completeTodoCapability,
    deleteTodoCapability,
    viewProfileCapability,
    updateProfileCapability,
    exportProfileCapability,
  ],
})
