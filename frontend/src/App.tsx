import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import WorkspacePage from './pages/WorkspacePage'
import WorkspacesPage from './pages/WorkspacesPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WorkspacesPage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
      </Route>
    </Routes>
  )
}

export default App
