import { useEffect, useState, type FormEvent } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useWorkspaceList } from '../context/WorkspaceListContext'
import { WS_TILES, iconLetter } from '../workspaceStyle'
import './Sidebar.css'

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (collapsed: boolean) => void }) {
  const [workspaceName, setWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const { identity } = useUser()
  const { workspaces, reload } = useWorkspaceList()
  const navigate = useNavigate()
  const workspaceMatch = useMatch('/workspaces/:workspaceId')
  const activeId = workspaceMatch?.params.workspaceId

  // "Copied!" only needs to show briefly; the cleanup stops the reset from firing after the sidebar unmounts.
  useEffect(() => {
    if (copyState !== 'copied') {
      return
    }

    const timeoutId = window.setTimeout(() => setCopyState('idle'), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [copyState])

  // The clipboard API only exists on secure origins (https or localhost), so opening the app over the
  // network falls back to showing the id for copying by hand.
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(identity.userId)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

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

      const workspace = (await response.json()) as { id: string }
      setWorkspaceName('')
      reload()
      navigate(`/workspaces/${encodeURIComponent(workspace.id)}`)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create workspace.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && <h2 className="sidebar__title">Workspaces</h2>}
        <button
          type="button"
          className="sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      {!collapsed ? (
        <div className="sidebar__content">
          {activeId ? (
            <Link className="sidebar__back" to="/" aria-label="Back to main menu">
              <span aria-hidden="true">←</span>
              <span className="sidebar__back-label">Main menu</span>
            </Link>
          ) : null}

          {!activeId ? (
            <form className="sidebar__workspace-form" onSubmit={handleCreateWorkspace}>
              <label htmlFor="sidebarWorkspaceName">Create a workspace</label>
              <input
                id="sidebarWorkspaceName"
                type="text"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Workspace name"
                maxLength={100}
                disabled={isCreating}
              />
              <button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create'}
              </button>
              {createError ? <p className="sidebar__error" role="alert">{createError}</p> : null}
            </form>
          ) : null}

          <div className="sidebar__list-heading">
            <span>All workspaces</span>
            <span className="sidebar__count">{workspaces.length}</span>
          </div>

          <ul className="sidebar__list">
            {workspaces.map((workspace, index) => {
              const tile = WS_TILES[index % WS_TILES.length]
              const isActive = workspace.id === activeId
              return (
                <li key={workspace.id}>
                  <Link
                    className={isActive ? 'sidebar__ws sidebar__ws--active' : 'sidebar__ws'}
                    to={`/workspaces/${encodeURIComponent(workspace.id)}`}
                  >
                    <span
                      className="sidebar__ws-icon"
                      style={{ background: tile.bg, color: tile.fg }}
                      aria-hidden="true"
                    >
                      {iconLetter(workspace.name)}
                    </span>
                    <span className="sidebar__ws-name">{workspace.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {!collapsed ? (
        <div className="sidebar__footer">
          <span className="sidebar__signed-in">
            Signed in as <strong>{identity.displayName}</strong>
          </span>
          <button type="button" className="sidebar__copy-id" onClick={handleCopyId}>
            {copyState === 'copied' ? 'Copied!' : 'Copy my ID'}
          </button>
          {copyState === 'failed' ? (
            <code className="sidebar__user-id" aria-label="Your user ID">{identity.userId}</code>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}

export default Sidebar