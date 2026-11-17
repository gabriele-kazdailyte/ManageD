import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import { UserContext, clearStoredIdentity, persistIdentity, readStoredIdentity, type UserIdentity } from './context/UserContext'
import LoginPage from './pages/LoginPage'
import WorkspacePage from './pages/WorkspacePage'
import WorkspacesPage from './pages/WorkspacesPage'
import { WorkspaceListProvider } from './context/WorkspaceListContext'
import './App.css'

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

  if (!identity) {
    return <LoginPage onLoggedIn={setIdentity} />
  }

  return (
    <UserContext.Provider value={{ identity, setIdentity, logout }}>
      <WorkspaceListProvider key={identity.userId}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<WorkspacesPage />} />
            <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
          </Route>
        </Routes>
      </WorkspaceListProvider>
    </UserContext.Provider>
  )
}

export default App
