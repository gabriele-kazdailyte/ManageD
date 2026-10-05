import { Route, Routes } from 'react-router-dom'
import WorkspacePage from './pages/WorkspacePage'
import WorkspacesPage from './pages/WorkspacesPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<WorkspacesPage />} />
      <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
    </Routes>
  )
}

export default App
