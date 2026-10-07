import './TodoList.css'

type TodoListProps = {
  label: string
  type?: string
}

function TodoList({ label, type = 'application/todo-list' }: TodoListProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(type, label)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      className="draggable-block"
      draggable
      onDragStart={handleDragStart}
      aria-label={`Draggable ${label} block`}
    >
      {label}
    </div>
  )
}

export default TodoList
