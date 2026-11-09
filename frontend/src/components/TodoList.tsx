import './TodoList.css'

type TodoListProps = {
  label: string
  type?: string
  hint?: string | null
  onClick?: () => void
}

function TodoList({ label, type = 'application/todo-list', hint = null, onClick }: TodoListProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(type, label)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className="draggable-block"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Draggable ${label} block`}
    >
      {label}
      {hint ? <span className="draggable-block__hint">{hint}</span> : null}
    </div>
  )
}

export default TodoList
