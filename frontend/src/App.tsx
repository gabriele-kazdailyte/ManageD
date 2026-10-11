import { useEffect, useState, type FormEvent } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { UserContext, createIdentity, persistIdentity, readStoredIdentity, type UserIdentity } from './context/UserContext'
import WorkspacePage from './pages/WorkspacePage'
import WorkspacesPage from './pages/WorkspacesPage'
import './App.css'

function App() {
  const [identity, setIdentity] = useState<UserIdentity | null>(() => readStoredIdentity())
  const [draftName, setDraftName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (identity) {
      persistIdentity(identity)
    }
  }, [identity])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = draftName.trim()
    if (!trimmedName) {
      setError('Please enter a display name.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const nextIdentity = await createIdentity(trimmedName)
      setIdentity(nextIdentity)
      setDraftName('')
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.message.startsWith('Failed to create user')
          ? requestError.message
          : 'Unable to reach the server. Check that the backend is running, then try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!identity) {
    return (
      <div className="identity-gate">
        <form className="identity-form" onSubmit={handleSubmit}>
          <h1>Welcome to ManageD</h1>
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Your name"
            autoComplete="nickname"
            autoFocus
            maxLength={64}
          />
          {error ? <p className="identity-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating profile...' : 'Continue'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <UserContext.Provider value={{ identity, setIdentity }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WorkspacesPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
        </Route>
      </Routes>
    </UserContext.Provider>
  )
}

export default App
