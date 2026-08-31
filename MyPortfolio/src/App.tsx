import { useEffect, useMemo, useReducer, useState } from 'react'

type NavKey = 'Overview' | 'Projects' | 'Team' | 'Calendar' | 'Messages'
type Status = 'Upcoming' | 'In Progress' | 'Completed'
type ViewMode = 'timeline' | 'board'
type StatFilter = 'All' | Status

type Member = {
  id: string
  name: string
  initials: string
  color: string
}

type TaskItem = {
  id: string
  title: string
  lane: string
  start: number
  duration: number
  status: Status
  color: string
  assignees: string[]
  description: string
}

type Project = {
  id: string
  name: string
  tasks: TaskItem[]
}

type TodayTask = {
  id: string
  title: string
  time: string
  completed: boolean
}

type MessageItem = {
  id: string
  sender: string
  snippet: string
  time: string
  unread: boolean
  thread: string[]
}

type AppState = {
  activeNav: NavKey
  activeProjectId: string
  timelineMode: ViewMode
  statFilter: StatFilter
  searchOpen: boolean
  settingsOpen: boolean
  profileOpen: boolean
  searchQuery: string
  selectedTaskId: string | null
  expandedMembersTaskId: string | null
  selectedConversationId: string
  activeView: 'dashboard' | 'messages'
  projects: Project[]
  todayTasks: TodayTask[]
  messages: MessageItem[]
}

type Action =
  | { type: 'SET_NAV'; payload: NavKey }
  | { type: 'SET_PROJECT'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_FILTER'; payload: StatFilter }
  | { type: 'TOGGLE_SEARCH' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'TOGGLE_PROFILE' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'OPEN_TASK'; payload: string | null }
  | { type: 'TOGGLE_MEMBER_EXPAND'; payload: string | null }
  | { type: 'ADD_PROJECT'; payload: { name: string; lane: string } }
  | { type: 'UPDATE_PROJECT_TASK'; payload: { taskId: string; patch: Partial<TaskItem> } }
  | { type: 'UPDATE_TODAY_TASK'; payload: { taskId: string; completed: boolean } }
  | { type: 'SET_CONVERSATION'; payload: string }
  | { type: 'SET_ACTIVE_VIEW'; payload: 'dashboard' | 'messages' }
  | { type: 'ADD_MESSAGE'; payload: MessageItem }

const STORAGE_KEY = 'tasker-dashboard-state-v1'

const members: Member[] = [
  { id: 'a', name: 'Alicia', initials: 'A', color: 'avatar-a' },
  { id: 'b', name: 'Bri', initials: 'B', color: 'avatar-b' },
  { id: 'c', name: 'Chris', initials: 'C', color: 'avatar-c' },
  { id: 'd', name: 'Dina', initials: 'D', color: 'avatar-d' },
  { id: 'e', name: 'Emily', initials: 'E', color: 'avatar-e' },
]

const defaultProjects: Project[] = [
  {
    id: 'plant-pals',
    name: 'Plant Pals',
    tasks: [
      { id: 't1', title: 'Search and Analysis', lane: 'Search and Analysis', start: 0, duration: 5, status: 'Upcoming', color: 'purple', assignees: ['a', 'b'], description: 'Research plant care trends and market gaps.' },
      { id: 't2', title: 'Ideation with Design Team', lane: 'Ideation with Design Team', start: 2, duration: 5, status: 'In Progress', color: 'coral', assignees: ['a', 'c', 'd'], description: 'Align concepts, user flows, and workshop ideas.' },
      { id: 't3', title: 'Wireframing and UI Design', lane: 'Wireframing and UI Design', start: 4, duration: 5, status: 'Upcoming', color: 'purple', assignees: ['a', 'b', 'd'], description: 'Create polished wireframes and interface specs.' },
      { id: 't4', title: 'Finalizing vendors for Plant supply', lane: 'Finalizing vendors for Plant supply', start: 6, duration: 4, status: 'Completed', color: 'outline', assignees: ['a'], description: 'Confirm product vendors and supply chain checks.' },
      { id: 't5', title: 'Developing landing page', lane: 'Developing the landing page and login/signup pages', start: 7, duration: 6, status: 'In Progress', color: 'pink', assignees: ['b', 'c', 'e'], description: 'Launch marketing page and onboarding experience.' },
      { id: 't6', title: 'Meet-up with design partner', lane: 'Meet-up with...', start: 10, duration: 3, status: 'Upcoming', color: 'teal', assignees: ['b'], description: 'Discuss implementation milestones and review timing.' },
      { id: 't7', title: 'Test Run with control group', lane: 'Test Run with control group', start: 12, duration: 4, status: 'Completed', color: 'green', assignees: ['c', 'e'], description: 'Capture user feedback and verify issue resolution.' },
    ],
  },
  {
    id: 'studio-ops',
    name: 'Studio Ops',
    tasks: [
      { id: 's1', title: 'Sprint planning', lane: 'Planning', start: 1, duration: 4, status: 'Upcoming', color: 'coral', assignees: ['a', 'b'], description: 'Prepare sprint goals and prioritize tasks.' },
      { id: 's2', title: 'Content calendar', lane: 'Content', start: 4, duration: 5, status: 'In Progress', color: 'purple', assignees: ['c', 'd'], description: 'Build weekly content plan and batch production.' },
      { id: 's3', title: 'QA review', lane: 'QA', start: 8, duration: 4, status: 'Completed', color: 'green', assignees: ['a', 'e'], description: 'Verify launch readiness and issues.' },
    ],
  },
  {
    id: 'launchbox',
    name: 'Launchbox',
    tasks: [
      { id: 'l1', title: 'Campaign audit', lane: 'Marketing', start: 0, duration: 6, status: 'In Progress', color: 'pink', assignees: ['a', 'b', 'd'], description: 'Review current ad performance and budget usage.' },
      { id: 'l2', title: 'Asset finalization', lane: 'Creative', start: 5, duration: 4, status: 'Upcoming', color: 'teal', assignees: ['e', 'c'], description: 'Finalize visuals and schedules for launch.' },
    ],
  },
]

const defaultTodayTasks: TodayTask[] = [
  { id: 'td1', title: 'Call with Backend team', time: '1:00 PM - 2:00 PM', completed: false },
  { id: 'td2', title: 'Create Sprint Backlog', time: 'Full Day', completed: true },
  { id: 'td3', title: 'Video Call with Ram', time: '12:00 PM - 12:30 PM', completed: false },
  { id: 'td4', title: 'Review Design Draft', time: '8:00 AM - 9:00 AM', completed: true },
]

const defaultMessages: MessageItem[] = [
  { id: 'm1', sender: 'Charlie Sheen', snippet: "Let's connect for quick discussion...", time: '12:45 PM', unread: true, thread: ['Hi team, I can share the revised mockup after lunch.', 'Perfect, we can sync right after the standup.'] },
  { id: 'm2', sender: 'Parth Suri', snippet: 'Great Work boss!', time: '1:20 PM', unread: false, thread: ['The client loved the proposal.', 'Fantastic, let’s lock the timeline today.'] },
  { id: 'm3', sender: 'Milton Lam', snippet: 'I need more time for the feature on...', time: '11:00 AM', unread: true, thread: ['I need a bit more time for QA.', 'Thanks, we’ll shift the card by one day.'] },
  { id: 'm4', sender: 'Raghav Chandra', snippet: 'Meeting scheduled for tomorrow!', time: '3:00 PM', unread: false, thread: ['The final review is set for tomorrow morning.', 'Great, I’ll share the notes.'] },
  { id: 'm5', sender: 'Kriti Arora', snippet: 'Graphics for the social media post t...', time: '2:00 PM', unread: false, thread: ['I uploaded the final social visuals.', 'Thanks! I’ll pass them to marketing.'] },
]

const initialState: AppState = {
  activeNav: 'Overview',
  activeProjectId: defaultProjects[0].id,
  timelineMode: 'timeline',
  statFilter: 'All',
  searchOpen: false,
  settingsOpen: false,
  profileOpen: false,
  searchQuery: '',
  selectedTaskId: null,
  expandedMembersTaskId: null,
  selectedConversationId: defaultMessages[0].id,
  activeView: 'dashboard',
  projects: defaultProjects,
  todayTasks: defaultTodayTasks,
  messages: defaultMessages,
}

function readStorage(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return initialState

  try {
    const parsed = JSON.parse(raw) as AppState
    return { ...initialState, ...parsed, projects: parsed.projects?.length ? parsed.projects : initialState.projects, todayTasks: parsed.todayTasks?.length ? parsed.todayTasks : initialState.todayTasks, messages: parsed.messages?.length ? parsed.messages : initialState.messages }
  } catch {
    return initialState
  }
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_NAV':
      return { ...state, activeNav: action.payload, activeView: action.payload === 'Messages' ? 'messages' : 'dashboard', settingsOpen: false, profileOpen: false }
    case 'SET_PROJECT':
      return { ...state, activeProjectId: action.payload }
    case 'SET_VIEW_MODE':
      return { ...state, timelineMode: action.payload }
    case 'SET_FILTER':
      return { ...state, statFilter: action.payload }
    case 'TOGGLE_SEARCH':
      return { ...state, searchOpen: !state.searchOpen, settingsOpen: false, profileOpen: false }
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen, profileOpen: false }
    case 'TOGGLE_PROFILE':
      return { ...state, profileOpen: !state.profileOpen, settingsOpen: false }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'OPEN_TASK':
      return { ...state, selectedTaskId: action.payload }
    case 'TOGGLE_MEMBER_EXPAND':
      return { ...state, expandedMembersTaskId: state.expandedMembersTaskId === action.payload ? null : action.payload }
    case 'ADD_PROJECT': {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: action.payload.name,
        tasks: [
          {
            id: `task-${Date.now()}`,
            title: `${action.payload.name} kickoff`,
            lane: action.payload.lane,
            start: 1,
            duration: 4,
            status: 'Upcoming',
            color: 'coral',
            assignees: ['a', 'b'],
            description: 'New project setup and kickoff plan.',
          },
        ],
      }
      return { ...state, projects: [...state.projects, newProject], activeProjectId: newProject.id, activeNav: 'Projects' }
    }
    case 'UPDATE_PROJECT_TASK': {
      return {
        ...state,
        projects: state.projects.map((project) => project.id === state.activeProjectId
          ? {
              ...project,
              tasks: project.tasks.map((task) => task.id === action.payload.taskId ? { ...task, ...action.payload.patch } : task),
            }
          : project),
      }
    }
    case 'UPDATE_TODAY_TASK':
      return {
        ...state,
        todayTasks: state.todayTasks.map((task) => task.id === action.payload.taskId ? { ...task, completed: action.payload.completed } : task),
      }
    case 'SET_CONVERSATION':
      return { ...state, selectedConversationId: action.payload }
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload }
    case 'ADD_MESSAGE':
      return { ...state, messages: [action.payload, ...state.messages], selectedConversationId: action.payload.id, activeNav: 'Messages', activeView: 'messages' }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, readStorage)
  const [dragState, setDragState] = useState<{ taskId: string; mode: 'drag' | 'resize'; originX: number; originStart: number; originDuration: number } | null>(null)
  const [projectForm, setProjectForm] = useState({ name: '', lane: 'Planning' })
  const [taskDraft, setTaskDraft] = useState({ title: '', lane: '', status: 'Upcoming' as Status, assignees: ['a'], description: '', start: 1, duration: 3 })

  const currentProject = useMemo(() => state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0], [state.projects, state.activeProjectId])

  const visibleTasks = useMemo(() => {
    const tasks = currentProject.tasks.filter((task) => {
      if (state.searchQuery.trim()) {
        const term = state.searchQuery.toLowerCase()
        if (!task.title.toLowerCase().includes(term) && !task.lane.toLowerCase().includes(term)) return false
      }
      if (state.statFilter === 'All') return true
      return task.status === state.statFilter
    })
    return tasks
  }, [currentProject, state.searchQuery, state.statFilter])

  const completedTaskCount = useMemo(() => currentProject.tasks.filter((task) => task.status === 'Completed').length, [currentProject.tasks])
  const todayCompletedCount = useMemo(() => state.todayTasks.filter((task) => task.completed).length, [state.todayTasks])

  const selectedTask = useMemo(() => currentProject.tasks.find((task) => task.id === state.selectedTaskId) ?? null, [currentProject.tasks, state.selectedTaskId])
  const selectedConversation = useMemo(() => state.messages.find((message) => message.id === state.selectedConversationId) ?? state.messages[0], [state.messages, state.selectedConversationId])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      if (!dragState) return
      const delta = Math.round((event.clientX - dragState.originX) / 58)

      if (dragState.mode === 'drag') {
        const nextStart = Math.max(0, dragState.originStart + delta)
        dispatch({
          type: 'UPDATE_PROJECT_TASK',
          payload: { taskId: dragState.taskId, patch: { start: nextStart } },
        })
      }

      if (dragState.mode === 'resize') {
        const nextDuration = Math.max(1, dragState.originDuration + delta)
        dispatch({
          type: 'UPDATE_PROJECT_TASK',
          payload: { taskId: dragState.taskId, patch: { duration: nextDuration } },
        })
      }
    }

    const handlePointerUp = () => setDragState(null)

    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)

    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [dragState])

  const statCards = [
    { id: 'Upcoming', label: 'Upcoming Tasks', value: currentProject.tasks.filter((task) => task.status === 'Upcoming').length, tone: 'rose' },
    { id: 'In Progress', label: 'In-Progress Tasks', value: currentProject.tasks.filter((task) => task.status === 'In Progress').length, tone: 'amber' },
    { id: 'Completed', label: 'Completed Tasks', value: completedTaskCount + todayCompletedCount, tone: 'green' },
  ] as const

  const dayLabels = ['F 25', 'S 26', 'S 27', 'M 28', 'T 29', 'T 30', 'W 01', 'T 02', 'F 03', 'S 04', 'S 05', 'M 06', 'T 07', 'W 08', 'T 09', 'F 10', 'S 11']

  const closePanels = () => {
    dispatch({ type: 'TOGGLE_SEARCH' })
    dispatch({ type: 'TOGGLE_SETTINGS' })
    dispatch({ type: 'TOGGLE_PROFILE' })
  }

  const handleTaskUpdate = (patch: Partial<TaskItem>) => {
    if (!selectedTask) return
    dispatch({ type: 'UPDATE_PROJECT_TASK', payload: { taskId: selectedTask.id, patch } })
  }

  const handleSubmitProject = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = projectForm.name.trim()
    if (!trimmed) return
    dispatch({ type: 'ADD_PROJECT', payload: { name: trimmed, lane: projectForm.lane } })
    setProjectForm({ name: '', lane: 'Planning' })
  }

  const handleTaskCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!taskDraft.title.trim()) return
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: taskDraft.title,
      lane: taskDraft.lane || 'Planning',
      start: taskDraft.start,
      duration: taskDraft.duration,
      status: taskDraft.status,
      color: 'purple',
      assignees: taskDraft.assignees,
      description: taskDraft.description || 'New task added from the dashboard.',
    }

    const nextProjects = state.projects.map((project) => project.id === state.activeProjectId ? { ...project, tasks: [...project.tasks, newTask] } : project)
    dispatch({ type: 'SET_NAV', payload: 'Projects' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, projects: nextProjects }))
    setTaskDraft({ title: '', lane: '', status: 'Upcoming', assignees: ['a'], description: '', start: 1, duration: 3 })
  }

  const boardColumns: Status[] = ['Upcoming', 'In Progress', 'Completed']

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <nav className="top-nav" aria-label="Main navigation">
          <div className="brand-wrap">
            <div className="brand-mark">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="20" fill="#F7B26A" opacity="0.28" />
                <path d="M32 12 L36.2 25.1 L50 32 L36.2 38.9 L32 52 L27.8 38.9 L14 32 L27.8 25.1 Z" fill="#F29A3E" />
                <circle cx="32" cy="32" r="4" fill="#fff7ee" />
              </svg>
            </div>
            <span className="brand-name">Tasker</span>
          </div>

          <div className="nav-links">
            {(['Overview', 'Projects', 'Team', 'Calendar', 'Messages'] as NavKey[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`nav-link ${state.activeNav === item ? 'active' : ''}`}
                onClick={() => {
                  dispatch({ type: 'SET_NAV', payload: item })
                  if (item === 'Messages') {
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'messages' })
                  } else {
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'dashboard' })
                  }
                }}
              >
                {item === 'Overview' && <svg viewBox="0 0 24 24"><path d="M4 12.75V7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v5.25M4 12.75h16M8 18h8" /></svg>}
                {item === 'Projects' && <svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" /><path d="M8 9h8M8 12h8M8 15h5" /></svg>}
                {item === 'Team' && <svg viewBox="0 0 24 24"><path d="M8 19a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM10 9.5a3 3 0 1 1 6 0V11H10V9.5Z" /><path d="M8 13v-1.5A3.5 3.5 0 0 1 11.5 8H12" /></svg>}
                {item === 'Calendar' && <svg viewBox="0 0 24 24"><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>}
                {item === 'Messages' && <svg viewBox="0 0 24 24"><path d="M5 18.5V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v7A2.5 2.5 0 0 1 16.5 18H9l-4 3v-2.5Z" /><path d="M9 10.5h6M9 13.5h3" /></svg>}
                <span>{item}</span>
                {item === 'Messages' && <span className="notif-dot" />}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <div className="dropdown-wrap">
              <button type="button" className="icon-btn" aria-label="Settings" onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}>
                <svg viewBox="0 0 24 24"><path d="M12 3.5v2.1m0 14.8v2.1m8.5-8.5h-2.1M5.6 12H3.5m14.8 0a4.3 4.3 0 1 1-8.6 0 4.3 4.3 0 0 1 8.6 0Z" /></svg>
              </button>
              {state.settingsOpen && (
                <div className="dropdown-panel settings-panel">
                  <h4>Workspace Settings</h4>
                  <label><input type="checkbox" defaultChecked /> Notifications</label>
                  <label><input type="checkbox" defaultChecked /> Auto-save</label>
                  <label><input type="checkbox" /> Dark mode</label>
                </div>
              )}
            </div>

            <div className="dropdown-wrap">
              <button type="button" className="icon-btn" aria-label="Search" onClick={() => dispatch({ type: 'TOGGLE_SEARCH' })}>
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="5.5" /><path d="M16 16l4 4" /></svg>
              </button>
            </div>

            <div className="dropdown-wrap">
              <button type="button" className="user-avatar" aria-label="User profile" onClick={() => dispatch({ type: 'TOGGLE_PROFILE' })}>JP</button>
              {state.profileOpen && (
                <div className="dropdown-panel profile-panel">
                  <button type="button">Profile</button>
                  <button type="button">Workspace</button>
                  <button type="button">Logout</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {state.searchOpen && (
          <div className="modal-backdrop" onClick={() => dispatch({ type: 'TOGGLE_SEARCH' })}>
            <div className="modal-card search-modal" onClick={(event) => event.stopPropagation()}>
              <h3>Search Tasks & Projects</h3>
              <input
                type="text"
                autoFocus
                placeholder="Search roadmap, tasks or documents"
                value={state.searchQuery}
                onChange={(event) => dispatch({ type: 'SET_SEARCH_QUERY', payload: event.target.value })}
              />
              <div className="search-results">
                {visibleTasks.slice(0, 4).map((task) => (
                  <button key={task.id} type="button" className="search-result" onClick={() => { dispatch({ type: 'OPEN_TASK', payload: task.id }); dispatch({ type: 'TOGGLE_SEARCH' }) }}>
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <header className="page-header">
          <div className="header-copy">
            <h1>{state.activeNav}</h1>
            <p>Have a bird's eye view of all your projects.</p>
          </div>
          <button type="button" className="add-project-btn" onClick={() => dispatch({ type: 'SET_NAV', payload: 'Projects' })}>
            <span className="plus">＋</span>
            Add New Project
          </button>
        </header>

        <section className="stats-row" aria-label="Task summary cards">
          {statCards.map((card) => (
            <button key={card.id} type="button" className={`stat-card ${card.tone} ${state.statFilter === card.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_FILTER', payload: card.id })}>
              <div className="card-badge">
                <svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
              </div>
              <div className="stat-meta">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </button>
          ))}
        </section>

        {state.activeView === 'messages' ? (
          <div className="messages-view">
            <div className="messages-list card-surface">
              <div className="card-header row-between">
                <h3>Messages</h3>
                <button type="button" className="secondary-btn" onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'dashboard' })}>Back to overview</button>
              </div>
              {state.messages.map((message) => (
                <button key={message.id} type="button" className={`message-row ${state.selectedConversationId === message.id ? 'selected' : ''}`} onClick={() => dispatch({ type: 'SET_CONVERSATION', payload: message.id })}>
                  <span className={`message-avatar ${members[message.id.length % members.length].color}`}>{message.sender.slice(0, 1)}</span>
                  <div className="message-copy">
                    <div className="message-top"><strong>{message.sender}</strong><time>{message.time}</time></div>
                    <p>{message.snippet}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="conversation-panel card-surface">
              <div className="card-header row-between">
                <h3>{selectedConversation.sender}</h3>
                <span className="small-pill">Online</span>
              </div>
              <div className="thread-list">
                {selectedConversation.thread.map((line, index) => (
                  <div key={`${line}-${index}`} className={`thread-bubble ${index % 2 === 0 ? 'own' : 'other'}`}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="composer">
                <input type="text" placeholder="Reply" />
                <button type="button" className="add-project-btn compact">Send</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="workspace-layout">
            <main className="roadmap-card card-surface">
              <div className="card-header row-between">
                <h2>Project Roadmap</h2>
                <div className="toolbar-right">
                  <select className="select-pill" value={state.activeProjectId} onChange={(event) => dispatch({ type: 'SET_PROJECT', payload: event.target.value })}>
                    {state.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <div className="toggle-group">
                    <button type="button" className={`toggle-pill ${state.timelineMode === 'timeline' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'timeline' })}>Timeline</button>
                    <button type="button" className={`toggle-pill ${state.timelineMode === 'board' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'board' })}>Board</button>
                  </div>
                </div>
              </div>

              {state.timelineMode === 'timeline' ? (
                <div className="timeline-wrap">
                  <div className="timeline-ruler">
                    <div className="month-label month-a">APR</div>
                    <div className="month-label month-b">MAY</div>
                    <div className="ruler-grid">
                      {dayLabels.map((label) => <span key={label}>{label}</span>)}
                    </div>
                  </div>

                  {Array.from(new Set(currentProject.tasks.map((task) => task.lane))).map((lane) => {
                    const laneTasks = visibleTasks.filter((task) => task.lane === lane)
                    if (!laneTasks.length) return null
                    return (
                      <div key={lane} className="lane-row">
                        <div className="lane-name">{lane}</div>
                        <div className="lane-track">
                          {laneTasks.map((task) => {
                            const assigneeData = task.assignees.map((memberId) => members.find((member) => member.id === memberId)).filter(Boolean) as Member[]
                            const isExpanded = state.expandedMembersTaskId === task.id
                            const visibleAssignees = isExpanded ? assigneeData : assigneeData.slice(0, 3)
                            return (
                              <div
                                key={task.id}
                                className={`task-bar ${task.color} ${task.duration > 5 ? 'wide' : task.duration > 3 ? 'medium' : ''}`}
                                style={{ left: `${(task.start / 17) * 100}%`, width: `${(task.duration / 17) * 100}%` }}
                                onClick={() => dispatch({ type: 'OPEN_TASK', payload: task.id })}
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setDragState({ taskId: task.id, mode: 'drag', originX: event.clientX, originStart: task.start, originDuration: task.duration })
                                }}
                              >
                                <div className="bar-body">
                                  <div className="task-text">
                                    <strong>{task.title}</strong>
                                    <small>{task.status}</small>
                                  </div>
                                  <div className="avatar-stack">
                                    {visibleAssignees.map((member) => (
                                      <span key={`${task.id}-${member.id}`} className={`avatar ${member.color}`}>{member.initials}</span>
                                    ))}
                                    {assigneeData.length > visibleAssignees.length && (
                                      <button
                                        type="button"
                                        className="avatar more"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          dispatch({ type: 'TOGGLE_MEMBER_EXPAND', payload: task.id })
                                        }}
                                      >
                                        +{assigneeData.length - visibleAssignees.length}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className="resize-handle"
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setDragState({ taskId: task.id, mode: 'resize', originX: event.clientX, originStart: task.start, originDuration: task.duration })
                                  }}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="board-view">
                  {boardColumns.map((column) => (
                    <div key={column} className="board-column">
                      <div className="board-column-header">{column}</div>
                      <div className="board-card-stack">
                        {currentProject.tasks.filter((task) => task.status === column && (state.statFilter === 'All' || task.status === state.statFilter)).map((task) => (
                          <button key={task.id} type="button" className="board-card" onClick={() => dispatch({ type: 'OPEN_TASK', payload: task.id })}>
                            <span className={`board-card-tag ${task.color}`}>{task.title}</span>
                            <small>{task.lane}</small>
                            <div className="board-assignees">
                              {task.assignees.map((memberId) => {
                                const member = members.find((person) => person.id === memberId)
                                return member ? <span key={`${task.id}-${member.id}`} className={`avatar ${member.color}`}>{member.initials}</span> : null
                              })}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>

            <aside className="sidebar-column">
              <section className="card-surface messages-card">
                <div className="card-header row-between">
                  <h3>Recent Messages</h3>
                  <button type="button" className="view-all-link" onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'messages' })}>View all</button>
                </div>

                <div className="message-list">
                  {state.messages.slice(0, 5).map((message) => (
                    <button key={message.id} type="button" className="message-row compact" onClick={() => {
                      dispatch({ type: 'SET_CONVERSATION', payload: message.id })
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'messages' })
                    }}>
                      <span className={`message-avatar ${members[message.id.length % members.length].color}`}>{message.sender.slice(0, 1)}</span>
                      <div className="message-copy">
                        <div className="message-top"><strong>{message.sender}</strong><time>{message.time}</time></div>
                        <p>{message.snippet}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card-surface tasks-card">
                <div className="card-header">
                  <h3>Today's tasks</h3>
                </div>

                <div className="task-list-modern">
                  {state.todayTasks.map((task) => (
                    <div key={task.id} className={`task-row ${task.completed ? 'muted' : ''}`}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(event) => dispatch({ type: 'UPDATE_TODAY_TASK', payload: { taskId: task.id, completed: event.target.checked } })}
                        className="task-checkbox"
                      />
                      <div className="task-copy-modern"> 
                        <strong className={task.completed ? 'strikethrough' : ''}>{task.title}</strong>
                        <small>{task.time}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}

        <button type="button" className="floating-add" onClick={() => dispatch({ type: 'SET_NAV', payload: 'Projects' })}>＋</button>

        {state.activeView !== 'messages' && (
          <div className="project-modal-backdrop" style={{ display: state.activeNav === 'Projects' ? 'flex' : 'none' }}>
            <div className="project-modal-card">
              <h3>Create a project</h3>
              <form onSubmit={handleSubmitProject}>
                <label>
                  Project name
                  <input value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} placeholder="Project name" />
                </label>
                <label>
                  Default lane
                  <select value={projectForm.lane} onChange={(event) => setProjectForm((current) => ({ ...current, lane: event.target.value }))}>
                    <option value="Planning">Planning</option>
                    <option value="Design">Design</option>
                    <option value="Development">Development</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={() => dispatch({ type: 'SET_NAV', payload: 'Overview' })}>Cancel</button>
                  <button type="submit" className="add-project-btn compact">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedTask && (
          <div className="task-detail-backdrop" onClick={() => dispatch({ type: 'OPEN_TASK', payload: null })}>
            <div className="task-detail-panel" onClick={(event) => event.stopPropagation()}>
              <div className="card-header row-between">
                <h3>Task Details</h3>
                <button type="button" className="icon-btn close-btn" onClick={() => dispatch({ type: 'OPEN_TASK', payload: null })}>×</button>
              </div>

              <label>
                Title
                <input value={selectedTask.title} onChange={(event) => handleTaskUpdate({ title: event.target.value })} />
              </label>

              <div className="detail-grid">
                <label>
                  Start day
                  <input type="number" min={0} max={15} value={selectedTask.start} onChange={(event) => handleTaskUpdate({ start: Number(event.target.value) })} />
                </label>
                <label>
                  Duration
                  <input type="number" min={1} max={10} value={selectedTask.duration} onChange={(event) => handleTaskUpdate({ duration: Number(event.target.value) })} />
                </label>
              </div>

              <label>
                Lane
                <input value={selectedTask.lane} onChange={(event) => handleTaskUpdate({ lane: event.target.value })} />
              </label>

              <label>
                Status
                <select value={selectedTask.status} onChange={(event) => handleTaskUpdate({ status: event.target.value as Status })}>
                  <option value="Upcoming">Upcoming</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>

              <label>
                Description
                <textarea value={selectedTask.description} onChange={(event) => handleTaskUpdate({ description: event.target.value })} />
              </label>

              <div className="assignee-list">
                {members.map((member) => (
                  <label key={member.id} className="person-select">
                    <input type="checkbox" checked={selectedTask.assignees.includes(member.id)} onChange={() => {
                      const nextAssignees = selectedTask.assignees.includes(member.id)
                        ? selectedTask.assignees.filter((id) => id !== member.id)
                        : [...selectedTask.assignees, member.id]
                      handleTaskUpdate({ assignees: nextAssignees })
                    }} />
                    <span className={`avatar ${member.color}`}>{member.initials}</span>
                    {member.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
