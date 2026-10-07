import { useState } from 'react'
import Toolbar from '../components/Toolbar'
import Canvas from '../components/Canvas'

function WorkspacePage() {
  const [droppedBlocks, setDroppedBlocks] = useState<string[]>([])

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const item = event.dataTransfer.getData('application/todo-list')
    if (!item) {
      return
    }

    setDroppedBlocks((current) => [...current, item])
  }

  return (
    <>
      <Toolbar />
      <Canvas droppedBlocks={droppedBlocks} onDrop={handleDrop} />
    </>
  )
}

export default WorkspacePage
