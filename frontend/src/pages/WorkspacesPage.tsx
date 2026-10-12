import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import './WorkspacesPage.css'

type Workspace = {
  id: string
  name: string
}

const WS_TILES = [
  { bg: 'var(--ws-teal-bg)', fg: 'var(--ws-teal-text)' },
  { bg: 'var(--ws-mid-bg)', fg: 'var(--ws-mid-text)' },
  { bg: 'var(--ws-mint-bg)', fg: 'var(--ws-mint-text)' },
  { bg: 'var(--ws-blue-bg)', fg: 'var(--ws-blue-text)' },
]

function iconLetter(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'W'
}


function WorkspacesPage() {
  const { identity } = useUser()
  const { setCollapsed } = useOutletContext<{ setCollapsed: (collapsed: boolean) => void }>()

  const openNewWorkspace = () => {
    setCollapsed(false)
    setTimeout(() => {
      const input = document.getElementById('sidebarWorkspaceName') as HTMLInputElement | null
      input?.scrollIntoView({ block: 'nearest' })
      input?.focus()
    }, 0)
  }

  const now = new Date()
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  return (
    <section className="workspaces-page">
      <header className="workspaces-page__header">
        <p className="workspaces-page__eyebrow">Overview</p>
        <h1>{greeting}, {identity.displayName}</h1>
        <p className="workspaces-page__welcome">{today}</p>
      </header>


      {loadError ? (
        <div className="workspaces-page__error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={retryLoading}>Retry loading</button>
        </div>
      ) : null}

      <div className="workspace-list__heading">
        <h2>Workspaces</h2>
        {!isLoading ? <span>{workspaces.length}</span> : null}
      </div>

      {isLoading ? (
        <p className="workspace-list__message" role="status">Loading workspaces…</p>
      ) : (
        <ul className="workspace-list">
          {workspaces.map((workspace, index) => {
            const tile = WS_TILES[index % WS_TILES.length]
            return (

              <li key={workspace.id}>
                <Link className="workspace-card" to={`/workspaces/${encodeURIComponent(workspace.id)}`}>
                  <span
                    className="workspace-card__icon"
                    style={{ background: tile.bg, color: tile.fg }}
                    aria-hidden="true"
                  >
                    {iconLetter(workspace.name)}
                  </span>
                  <span className="workspace-card__name">{workspace.name}</span>
                  <span className="workspace-card__arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            )
          })}
          <li>
            <button type="button" className="workspace-card workspace-card--new" onClick={openNewWorkspace}>
              <span className="workspace-card__icon workspace-card__icon--new" aria-hidden="true">＋</span>
              <span className="workspace-card__name">New workspace</span>
            </button>
          </li>
        </ul>
      )}

    </section>
  )
}

export default WorkspacesPage
