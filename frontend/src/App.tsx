import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import { getUser } from './api/users'
import { UserContext, clearStoredIdentity, persistIdentity, readStoredIdentity, toIdentity, type UserIdentity } from './context/UserContext'
import LoginPage from './pages/LoginPage'
import WorkspacesPage from './pages/WorkspacesPage'
import { WorkspaceListProvider } from './context/WorkspaceListContext'
import './App.css'

// The workspace page pulls in React Flow, the largest dependency. Loading it on demand keeps the login page and
// the workspace list light.
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))

function App() {
  const [identity, setIdentity] = useState<UserIdentity | null>(() => readStoredIdentity())
  const navigate = useNavigate()

  const logout = useCallback(() => {
    clearStoredIdentity()
    setIdentity(null)
    // Back to "/", so whoever logs in next doesn't land on a workspace they may not belong to.
    navigate('/', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (identity) {
      persistIdentity(identity)
    }
  }, [identity])

  // The saved user can go stale: the account may be gone (for example after the database was reset), or its
  // names may have changed. Ask the server once per user and log out if it no longer exists.
  const userId = identity?.userId
  useEffect(() => {
    if (!userId) {
      return
    }

    const controller = new AbortController()

    getUser(userId, controller.signal)
      .then((user) => {
        if (!user) {
          logout()
          return
        }

        const fresh = toIdentity(user)
        // Only replace it when something changed, so the app doesn't re-render for nothing.
        setIdentity((current) =>
          current && current.username === fresh.username && current.displayName === fresh.displayName ? current : fresh,
        )
      })
      .catch(() => {
        // The server couldn't be reached (or the request was cancelled). Keep the saved user rather than
        // logging out just because the backend is down.
      })

    return () => controller.abort()
  }, [userId, logout])

  if (!identity) {
    return <LoginPage onLoggedIn={setIdentity} />
  }

  return (
    <UserContext.Provider value={{ identity, setIdentity, logout }}>
      <WorkspaceListProvider key={identity.userId}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<WorkspacesPage />} />
            <Route
              path="/workspaces/:workspaceId"
              element={
                <Suspense fallback={null}>
                  <WorkspacePage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </WorkspaceListProvider>
    </UserContext.Provider>
  )
}

export default App
