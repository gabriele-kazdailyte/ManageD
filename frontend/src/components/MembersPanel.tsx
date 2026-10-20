import { useEffect, useState, type FormEvent } from 'react'
import { addMember, listMembers, type Member } from '../api/workspaces'
import { useUser } from '../context/UserContext'
import './MembersPanel.css'

type MembersPanelProps = {
  workspaceId: string
}

type PanelMessage = {
  kind: 'success' | 'info' | 'error'
  text: string
}

// Checked before sending, so an obviously wrong paste gets a clear message instead of the backend's generic 400.
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function byDisplayName(a: Member, b: Member) {
  return a.displayName.localeCompare(b.displayName)
}

function MembersPanel({ workspaceId }: MembersPanelProps) {
  const { identity } = useUser()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [draftId, setDraftId] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState<PanelMessage | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    listMembers(workspaceId, controller.signal)
      .then(setMembers)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Could not load members.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [workspaceId])

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userId = draftId.trim()

    if (!USER_ID_PATTERN.test(userId)) {
      setMessage({ kind: 'error', text: "That doesn't look like a user ID." })
      return
    }

    setIsAdding(true)
    setMessage(null)

    try {
      const { member, outcome } = await addMember(workspaceId, userId)

      if (outcome === 'added') {
        setMembers((current) => [...current, member].sort(byDisplayName))
        setDraftId('')
        setMessage({
          kind: 'success',
          text: `${member.displayName} was added. They'll see the workspace after refreshing.`,
        })
      } else {
        setMessage({ kind: 'info', text: `${member.displayName} is already a member.` })
      }
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not add the member.' })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <section className="members-panel" aria-label="Workspace members">
      <button
        type="button"
        className="members-panel__toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Members{isLoading ? '' : ` (${members.length})`}</span>
        <span aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen ? (
        <div className="members-panel__body">
          {loadError ? (
            <p className="members-panel__message members-panel__message--error" role="alert">{loadError}</p>
          ) : isLoading ? (
            <p className="members-panel__status" role="status">Loading members…</p>
          ) : (
            <ul className="members-panel__list">
              {members.map((member) => (
                <li key={member.id} className="members-panel__member">
                  <span className="members-panel__avatar" aria-hidden="true">
                    {member.displayName.trim().charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="members-panel__name">{member.displayName}</span>
                  {member.id === identity.userId ? <span className="members-panel__you">(you)</span> : null}
                </li>
              ))}
            </ul>
          )}

          <form className="members-panel__form" onSubmit={handleAddMember}>
            <label htmlFor="memberUserId">Add a member by their user ID</label>
            <div className="members-panel__row">
              <input
                id="memberUserId"
                type="text"
                value={draftId}
                onChange={(event) => setDraftId(event.target.value)}
                placeholder="Paste a user ID"
                autoComplete="off"
                spellCheck={false}
                disabled={isAdding}
              />
              <button type="submit" disabled={isAdding}>
                {isAdding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>

          {message ? (
            <p
              className={`members-panel__message members-panel__message--${message.kind}`}
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default MembersPanel
