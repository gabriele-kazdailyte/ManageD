import { useRef, useState } from 'react'
import type { TodoItem } from '../api/assets'
import { MAX_ITEM_TEXT_LENGTH } from '../context/todoDeltas'

type TodoItemRowProps = {
  item: TodoItem
  isDragged: boolean
  isDropTarget: boolean
  onToggle: (isDone: boolean) => void
  onRename: (text: string) => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: () => void
  onDrop: () => void
}

function TodoItemRow({
  item,
  isDragged,
  isDropTarget,
  onToggle,
  onRename,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TodoItemRowProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelEditRef = useRef(false)

  const commit = () => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false
      setDraft(null)
      return
    }

    if (draft === null) {
      return
    }

    const text = draft.trim()
    setDraft(null)

    if (text !== '' && text !== item.text) {
      onRename(text)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      cancelEditRef.current = true
      event.currentTarget.blur()
    }
  }

  const className = [
    'todo-asset__item',
    isDragged ? 'todo-asset__item--dragged' : '',
    isDropTarget ? 'todo-asset__item--over' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={className}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDrop()
      }}
    >
      <span
        className="todo-asset__handle"
        draggable
        aria-hidden="true"
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('application/todo-item', item.id)
          if (event.currentTarget.parentElement) {
            event.dataTransfer.setDragImage(event.currentTarget.parentElement, 12, 12)
          }
          onDragStart()
        }}
        onDragEnd={onDragEnd}
      >
        ⋮⋮
      </span>
      <input type="checkbox" checked={item.isDone} onChange={(event) => onToggle(event.target.checked)} aria-label={`Mark "${item.text}" as done`} />
      <input
        type="text"
        className={item.isDone ? 'todo-asset__text todo-asset__text--done' : 'todo-asset__text'}
        value={draft ?? item.text}
        maxLength={MAX_ITEM_TEXT_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label="Item text"
      />
      <button type="button" className="todo-asset__item-remove" onClick={onRemove} aria-label={`Remove "${item.text}"`}>
        ×
      </button>
    </li>
  )
}

export default TodoItemRow
