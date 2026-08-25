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
    completed: { type: 'boolean' },
    id: { type: 'string' },
    title: { type: 'string' },
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
    properties: { query: { type: 'string', minLength: 1 } },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: todoListSchema,
  tags: ['todo', 'search'],
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
    properties: { title: { type: 'string', minLength: 1, maxLength: 160 } },
    required: ['title'],
    additionalProperties: false,
  },
  outputSchema: todoSchema,
  tags: ['todo', 'create'],
})

export const completeTodoCapability = defineRcipCapability<TodoIdInput, Todo>({
  id: 'todos.complete',
  title: 'Complete todo',
  description: 'Mark one existing todo item as completed.',
  scopeIds: [todoScope.id],
  effect: 'write',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string', minLength: 1 } },
    required: ['id'],
    additionalProperties: false,
  },
  outputSchema: todoSchema,
  tags: ['todo', 'complete'],
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
    properties: { id: { type: 'string', minLength: 1 } },
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
      displayName: { type: 'string', minLength: 1, maxLength: 80 },
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
