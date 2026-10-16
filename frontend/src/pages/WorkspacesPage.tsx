import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useWorkspaceList } from '../context/WorkspaceListContext'
import { WS_TILES, iconLetter } from '../workspaceStyle'
import './WorkspacesPage.css'

function WorkspacesPage() {
  const { identity } = useUser()
  const { workspaces, isLoading, error, reload, deleteWorkspace } = useWorkspaceList()
  const { setCollapsed } = useOutletContext<{ setCollapsed: (collapsed: boolean) => void }>()
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!window.confirm(`Delete "${workspaceName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingIds((current) => new Set(current).add(workspaceId))
    setDeleteError(null)

    try {
      await deleteWorkspace(workspaceId)
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError instanceof Error
          ? deleteRequestError.message
          : 'Could not delete the workspace.',
      )
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current)
        next.delete(workspaceId)
        return next
      })
    }
  }

  return (
    <section className="workspaces-page">
      <span className="workspaces-page__avatar" aria-hidden="true">
        {identity.displayName.trim().charAt(0).toUpperCase() || 'U'}
      </span>

      <header className="workspaces-page__header">
        <p className="workspaces-page__eyebrow">Overview</p>
        <h1>{greeting}, {identity.displayName}</h1>
        <p className="workspaces-page__welcome">{today}</p>
      </header>

      {error ? (
        <div className="workspaces-page__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload}>Retry loading</button>
        </div>
      ) : null}
      {deleteError ? <p className="workspaces-page__delete-error" role="alert">{deleteError}</p> : null}

      <div className="workspace-list__heading">
        <h2>Your workspaces</h2>
        {!isLoading ? <span>{workspaces.length}</span> : null}
      </div>

      {isLoading ? (
        <p className="workspace-list__message" role="status">Loading workspaces…</p>
      ) : (
        <ul className="workspace-list">
          {workspaces.map((workspace, index) => {
            const tile = WS_TILES[index % WS_TILES.length]
            return (
              <li className="workspace-list__item" key={workspace.id}>
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
                <button
                  type="button"
                  className="workspace-card__delete"
                  onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                  disabled={deletingIds.has(workspace.id)}
                  aria-label={`Delete ${workspace.name}`}
                  title={`Delete ${workspace.name}`}
                >
                  <span className="workspace-card__delete-icon" aria-hidden="true" />
                </button>
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
