import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import Workspace from './components/Workspace'
import './App.css'

function App() {
  const [droppedBlocks, setDroppedBlocks] = useState<string[]>([])

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const item = event.dataTransfer.getData('application/text-file')
    if (!item) {
      return
    }

    setDroppedBlocks((current) => [...current, item])
  }

  return (
    <div id="app">
      <Sidebar />
      <main className="main-content">
        <Toolbar />
        <Workspace droppedBlocks={droppedBlocks} onDrop={handleDrop} />
      </main>
    </div>
  )
}

export default App