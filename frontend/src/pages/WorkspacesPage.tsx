import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import './WorkspacesPage.css'

type Workspace = {
  id: string
  name: string
}

function WorkspacesPage() {
  const { identity } = useUser()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/workspaces?userId=${encodeURIComponent(identity.userId)}`, { signal })

    if (!response.ok) {
      throw new Error(`Could not load workspaces (HTTP ${response.status}).`)
    }

    return (await response.json()) as Workspace[]
  }, [identity.userId])

  const loadWorkspaces = useCallback((signal?: AbortSignal) => {
    void fetchWorkspaces(signal)
      .then(setWorkspaces)
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setLoadError(loadError instanceof Error ? loadError.message : 'Could not load workspaces.')
      })
      .finally(() => {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      })
  }, [fetchWorkspaces])

  const retryLoading = () => {
    setIsLoading(true)
    setLoadError(null)
    void loadWorkspaces()
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadWorkspaces(controller.signal)

    return () => controller.abort()
  }, [loadWorkspaces])

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = workspaceName.trim()

    if (!name) {
      setCreateError('Enter a workspace name.')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, creatorUserId: identity.userId }),
      })

      if (!response.ok) {
        throw new Error(`Could not create workspace (HTTP ${response.status}).`)
      }

      const workspace = (await response.json()) as Workspace
      navigate(`/workspaces/${encodeURIComponent(workspace.id)}`)
    } catch (createError) {
      setCreateError(createError instanceof Error ? createError.message : 'Could not create workspace.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="workspaces-page">
      <header className="workspaces-page__header">
        <div>
          <p className="workspaces-page__eyebrow">ManageD</p>
          <h1>Your workspaces</h1>
          <p className="workspaces-page__welcome">Welcome, {identity.displayName}</p>
        </div>
      </header>

      <form className="workspace-create" onSubmit={handleCreateWorkspace}>
        <label htmlFor="workspaceName">Create a workspace</label>
        <div className="workspace-create__controls">
          <input
            id="workspaceName"
            type="text"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="e.g. Product launch"
            maxLength={100}
            disabled={isCreating}
          />
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>

      {loadError ? (
        <div className="workspaces-page__error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={retryLoading}>Retry loading</button>
        </div>
      ) : null}

      {createError ? (
        <div className="workspaces-page__error" role="alert">
          <p>{createError}</p>
        </div>
      ) : null}

      <div className="workspace-list__heading">
        <h2>Workspaces</h2>
        {!isLoading ? <span>{workspaces.length}</span> : null}
      </div>

      {isLoading ? (
        <p className="workspace-list__message" role="status">Loading workspaces…</p>
      ) : workspaces.length > 0 ? (
        <ul className="workspace-list">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link className="workspace-card" to={`/workspaces/${encodeURIComponent(workspace.id)}`}>
                <span className="workspace-card__icon" aria-hidden="true">W</span>
                <span className="workspace-card__name">{workspace.name}</span>
                <span className="workspace-card__arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="workspace-list__empty">
          <div className="workspace-list__empty-icon" aria-hidden="true">＋</div>
          <h2>No workspaces yet</h2>
          <p>Create a workspace above to start organizing shared work.</p>
        </div>
      )}
    </section>
  )
}

export default WorkspacesPage
