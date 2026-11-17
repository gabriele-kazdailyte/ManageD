import { useState, type FormEvent } from 'react'
import { login, register } from '../api/users'
import { toIdentity, type UserIdentity } from '../context/UserContext'
import './LoginPage.css'

type Mode = 'login' | 'register'

type LoginPageProps = {
  onLoggedIn: (identity: UserIdentity) => void
}

// The same limits the backend checks (RegisterUserRequest). The browser checks them first so mistakes show
// up straight away; the server still checks everything, so these are only for convenience.
const USERNAME_MIN = 3
const USERNAME_MAX = 32
const USERNAME_PATTERN = '[A-Za-z0-9_]+'
const PASSWORD_MIN = 8
const PASSWORD_MAX = 128
const DISPLAY_NAME_MAX = 32

function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRegister = mode === 'register'

  // The username is kept when switching, the passwords aren't, so a typed password never moves between forms.
  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isRegister && password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    if (isRegister && !displayName.trim()) {
      setError('Enter a display name.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const user = isRegister
        ? await register(username.trim(), password, displayName.trim())
        : await login(username.trim(), password)

      onLoggedIn(toIdentity(user))
    } catch (requestError) {
      // fetch itself throws a TypeError when the request can't be sent at all.
      setError(
        requestError instanceof TypeError
          ? 'Unable to reach the server. Check that the backend is running, then try again.'
          : requestError instanceof Error
            ? requestError.message
            : 'Something went wrong.',
      )
      setPassword('')
      setConfirmPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>{isRegister ? 'Create an account' : 'Log in to ManageD'}</h1>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoFocus
          required
          maxLength={USERNAME_MAX}
          minLength={isRegister ? USERNAME_MIN : undefined}
          pattern={isRegister ? USERNAME_PATTERN : undefined}
          title={isRegister ? 'Letters, digits and underscores only' : undefined}
        />
        {isRegister ? (
          <p className="login-form__hint">3–32 letters, digits or underscores. You log in with this.</p>
        ) : null}

        {isRegister ? (
          <>
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              required
              maxLength={DISPLAY_NAME_MAX}
            />
            <p className="login-form__hint">What others see. Spaces and accents are fine.</p>
          </>
        ) : null}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          maxLength={PASSWORD_MAX}
          minLength={isRegister ? PASSWORD_MIN : undefined}
        />
        {isRegister ? <p className="login-form__hint">At least 8 characters.</p> : null}

        {isRegister ? (
          <>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              maxLength={PASSWORD_MAX}
            />
          </>
        ) : null}

        {error ? <p className="login-form__error" role="alert">{error}</p> : null}

        <button type="submit" className="login-form__submit" disabled={isSubmitting}>
          {isSubmitting
            ? isRegister ? 'Creating account…' : 'Logging in…'
            : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="login-form__switch">
          {isRegister ? 'Already have an account?' : 'No account yet?'}{' '}
          <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')} disabled={isSubmitting}>
            {isRegister ? 'Log in' : 'Create one'}
          </button>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
