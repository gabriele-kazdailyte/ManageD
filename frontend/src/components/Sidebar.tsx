import { useState, type FormEvent } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import './Sidebar.css'

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const { identity } = useUser()
  const navigate = useNavigate()
  const isInWorkspace = useMatch('/workspaces/:workspaceId') !== null

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
      {isInWorkspace ? (
        <div className="sidebar__content">
          <Link className="sidebar__back" to="/" aria-label="Back to main menu" title="Back to main menu">
            <span aria-hidden="true">←</span>
            <span className="sidebar__back-label">Main menu</span>
          </Link>
        </div>
      ) : !collapsed ? (
        <div className="sidebar__content">
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
        </div>
      ) : null}
    </aside>
  )
}

export default Sidebar