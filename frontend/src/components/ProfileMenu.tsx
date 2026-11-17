import { useEffect, useRef, useState } from 'react'
import { useUser } from '../context/UserContext'
import './ProfileMenu.css'

type ProfileMenuProps = {
  // In the collapsed sidebar only the avatar fits, so the name is hidden.
  compact: boolean
}

function ProfileMenu({ compact }: ProfileMenuProps) {
  const { identity, logout } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const initial = identity.displayName.trim().charAt(0).toUpperCase() || 'U'

  // While the popup is open, a click anywhere outside it or the Escape key closes it.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        // Give keyboard users their place back on the button that opened it.
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // "Copied!" only needs to show briefly; the cleanup stops the reset from firing after the menu unmounts.
  useEffect(() => {
    if (copyState !== 'copied') {
      return
    }

    const timeoutId = window.setTimeout(() => setCopyState('idle'), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [copyState])

  // The clipboard API only exists on secure origins (https or localhost). Opened over the network it fails,
  // and the ID shown above the button can be selected and copied by hand instead.
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(identity.userId)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="profile-menu" ref={containerRef}>
      {isOpen ? (
        <div className="profile-menu__popup" role="dialog" aria-label="Your profile">
          <div className="profile-menu__who">
            <span className="profile-menu__avatar profile-menu__avatar--large" aria-hidden="true">{initial}</span>
            <div className="profile-menu__names">
              <strong>{identity.displayName}</strong>
              <span>@{identity.username}</span>
            </div>
          </div>

          <div className="profile-menu__section">
            <span className="profile-menu__label">Your user ID</span>
            <code className="profile-menu__id">{identity.userId}</code>
            <button type="button" className="profile-menu__copy" onClick={handleCopyId}>
              {copyState === 'copied' ? 'Copied!' : 'Copy ID'}
            </button>
            <p className="profile-menu__hint">
              {copyState === 'failed'
                ? "Copying isn't allowed here. Select the ID above and copy it by hand."
                : 'Share it so others can add you to a workspace.'}
            </p>
          </div>

          <button type="button" className="profile-menu__logout" onClick={logout}>
            Log out
          </button>
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className={compact ? 'profile-menu__button profile-menu__button--compact' : 'profile-menu__button'}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={compact ? `Profile: ${identity.displayName}` : undefined}
      >
        <span className="profile-menu__avatar" aria-hidden="true">{initial}</span>
        {compact ? null : <span className="profile-menu__name">{identity.displayName}</span>}
      </button>
    </div>
  )
}

export default ProfileMenu
