import {
  type FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  RcipProvider,
  type RcipRuntime,
  type RcipRuntimeEvent,
  useRcipCapability,
  useRcipContext,
} from '@binaried/rcip'
import { RcipAssist } from '@binaried/rcip/assist'

import {
  completeTodoCapability,
  createTodoCapability,
  deleteTodoCapability,
  listTodosCapability,
  type Profile,
  searchTodosCapability,
  type Todo,
  updateProfileCapability,
  viewProfileCapability,
} from './capabilities'
import { Inspector } from './Inspector'
import { PilotTools } from './PilotTools'
import { pilotAssistDecide } from './pilotAssist'
import { createPilotRuntime } from './runtime'

type ActiveArea = 'profile' | 'todos'

interface PilotApplicationProps {
  readonly events: readonly RcipRuntimeEvent[]
  readonly runtime: RcipRuntime
}

const INITIAL_TODOS: Todo[] = [
  { id: 'todo-1', title: 'Submit expense report', completed: false },
  { id: 'todo-2', title: 'Review security policy', completed: false },
  { id: 'todo-3', title: 'Prepare pilot report', completed: false },
  { id: 'todo-4', title: 'Prepare pilot report', completed: false },
]

function PilotApplication({ events, runtime }: PilotApplicationProps) {
  const [activeArea, setActiveArea] = useState<ActiveArea>('todos')
  const [todos, setTodos] = useState<readonly Todo[]>(INITIAL_TODOS)
  const [profile, setProfile] = useState<Profile>({
    displayName: 'Alex Rivera',
    email: 'alex@example.test',
  })
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [profileDraft, setProfileDraft] = useState(profile.displayName)
  const nextTodoId = useRef(5)

  const semanticContext = useMemo(
    () => ({
      activeScopeIds: [activeArea],
      primaryScopeId: activeArea,
    }),
    [activeArea],
  )
  useRcipContext(semanticContext)

  const listTodos = useCallback(() => ({ items: [...todos] }), [todos])
  const searchTodos = useCallback(
    ({ query }: { query: string }) => ({
      items: todos.filter((todo) =>
        todo.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    }),
    [todos],
  )
  const createTodo = useCallback(
    ({ title }: { title: string }): Todo => {
      const todo: Todo = {
        id: `todo-${nextTodoId.current}`,
        title: title.trim(),
        completed: false,
      }
      nextTodoId.current += 1
      setTodos((current) => [...current, todo])
      return todo
    },
    [],
  )
  const completeTodo = useCallback(
    ({ id }: { id: string }): Todo => {
      const todo = todos.find((candidate) => candidate.id === id)
      if (!todo) throw new Error('Todo not found.')
      const completedTodo = { ...todo, completed: true }
      setTodos((current) =>
        current.map((candidate) =>
          candidate.id === id ? completedTodo : candidate,
        ),
      )
      return completedTodo
    },
    [todos],
  )
  const deleteTodo = useCallback(
    ({ id }: { id: string }) => {
      if (!todos.some((todo) => todo.id === id)) {
        throw new Error('Todo not found.')
      }
      setTodos((current) => current.filter((todo) => todo.id !== id))
      return { deletedId: id }
    },
    [todos],
  )
  const viewProfile = useCallback(() => ({ ...profile }), [profile])
  const updateProfile = useCallback(
    ({ displayName }: { displayName: string }): Profile => {
      const updated = { ...profile, displayName: displayName.trim() }
      setProfile(updated)
      setProfileDraft(updated.displayName)
      return updated
    },
    [profile],
  )

  const todoRevision = todos
    .map((todo) => `${todo.id}:${todo.completed ? '1' : '0'}:${todo.title}`)
    .join('|')

  useRcipCapability(listTodosCapability, {
    execute: listTodos,
    revision: todoRevision,
  })
  useRcipCapability(searchTodosCapability, {
    execute: searchTodos,
    revision: todoRevision,
  })
  useRcipCapability(createTodoCapability, {
    execute: createTodo,
    revision: todoRevision,
  })
  useRcipCapability(completeTodoCapability, {
    execute: completeTodo,
    getAvailability: () =>
      todos.some((todo) => !todo.completed)
        ? { available: true }
        : {
            available: false,
            reasonCode: 'NO_INCOMPLETE_TODOS',
            reason: 'There are no incomplete todos to complete.',
          },
    revision: todoRevision,
  })
  useRcipCapability(deleteTodoCapability, {
    execute: deleteTodo,
    getAvailability: () =>
      todos.length > 0
        ? { available: true }
        : {
            available: false,
            reasonCode: 'NO_TODOS',
            reason: 'There are no todos to delete.',
          },
    revision: todoRevision,
  })
  useRcipCapability(viewProfileCapability, {
    execute: viewProfile,
    revision: profile.displayName,
  })
  useRcipCapability(updateProfileCapability, {
    execute: updateProfile,
    revision: profile.displayName,
  })

  function submitTodo(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!newTodoTitle.trim()) return
    createTodo({ title: newTodoTitle })
    setNewTodoTitle('')
  }

  function submitProfile(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!profileDraft.trim()) return
    updateProfile({ displayName: profileDraft })
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">React Component Interface Protocol</p>
          <h1>One application, two interfaces.</h1>
          <p>
            People use the normal UI. An AI delegate sees a compact semantic
            capability surface backed by the same application behavior.
          </p>
        </div>
        <span className="pilot-badge">Protocol 1.0 reference</span>
      </header>

      <div className="layout">
        <section className="panel application-panel" aria-labelledby="app-heading">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Human interface</p>
              <h2 id="app-heading">Daily Desk</h2>
            </div>
            <nav className="tabs" aria-label="Application areas">
              <button
                type="button"
                aria-current={activeArea === 'todos' ? 'page' : undefined}
                onClick={() => setActiveArea('todos')}
              >
                Todos
              </button>
              <button
                type="button"
                aria-current={activeArea === 'profile' ? 'page' : undefined}
                onClick={() => setActiveArea('profile')}
              >
                Profile
              </button>
            </nav>
          </div>

          {activeArea === 'todos' ? (
            <div data-testid="todos-area">
              <form className="inline-form" onSubmit={submitTodo}>
                <label htmlFor="new-todo">New todo</label>
                <div>
                  <input
                    id="new-todo"
                    value={newTodoTitle}
                    onChange={(event) => setNewTodoTitle(event.target.value)}
                    placeholder="What needs doing?"
                  />
                  <button className="button button-primary" type="submit">
                    Add
                  </button>
                </div>
              </form>
              <ul className="todo-list">
                {todos.map((todo) => (
                  <li key={todo.id} data-testid={`todo-${todo.id}`}>
                    <span className={todo.completed ? 'todo-completed' : ''}>
                      {todo.title}
                    </span>
                    <div className="button-row">
                      <button
                        type="button"
                        disabled={todo.completed}
                        onClick={() => completeTodo({ id: todo.id })}
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => deleteTodo({ id: todo.id })}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <form
              className="profile-form"
              onSubmit={submitProfile}
              data-testid="profile-area"
            >
              <label htmlFor="profile-name">Display name</label>
              <input
                id="profile-name"
                value={profileDraft}
                onChange={(event) => setProfileDraft(event.target.value)}
              />
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" value={profile.email} readOnly />
              <button className="button button-primary" type="submit">
                Save profile
              </button>
            </form>
          )}
        </section>

        <PilotTools runtime={runtime} />
        <Inspector events={events} runtime={runtime} />
      </div>
      <RcipAssist
        runtime={runtime}
        decide={pilotAssistDecide}
        mode={
          new URLSearchParams(window.location.search).get('assistMode') ===
          'read-only'
            ? 'read-only'
            : 'interactive'
        }
        title="RCIP Assist"
        examplePrompts={[
          'Add "Book flight tickets" to my todos',
          'Show my profile',
          'List my todos',
        ]}
      />
    </main>
  )
}

export function App() {
  const [events, setEvents] = useState<readonly RcipRuntimeEvent[]>([])
  const [runtime] = useState(() =>
    createPilotRuntime((event) =>
      setEvents((current) => [...current.slice(-29), event]),
    ),
  )

  return (
    <RcipProvider runtime={runtime}>
      <PilotApplication events={events} runtime={runtime} />
    </RcipProvider>
  )
}
