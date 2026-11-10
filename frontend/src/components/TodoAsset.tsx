import { useState } from 'react'
import type { AssetDelta, AssetSnapshot } from '../api/assets'
import {
  MAX_ITEM_TEXT_LENGTH,
  addItemDelta,
  deleteItemDelta,
  editTextDelta,
  reorderDelta,
  setDoneDelta,
} from '../context/todoDeltas'
import TodoItemRow from './TodoItemRow'
import './TodoAsset.css'

type TodoAssetProps = {
  asset: AssetSnapshot
  isDeleting: boolean
  onDelete: (asset: AssetSnapshot) => void
  onUpdate: (asset: AssetSnapshot, delta: AssetDelta) => void
}

function TodoAsset({ asset, isDeleting, onDelete, onUpdate }: TodoAssetProps) {
  const [newText, setNewText] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const handleDelete = () => {
    onDelete(asset)
  }

  const handleAdd = () => {
    const text = newText.trim()
    setNewText('')

    if (text !== '') {
      onUpdate(asset, addItemDelta(asset.items, text))
    }
  }

  const endDrag = () => {
    setDraggedId(null)
    setOverId(null)
  }

  const handleDropOn = (targetId: string) => {
    const from = asset.items.findIndex((item) => item.id === draggedId)
    const to = asset.items.findIndex((item) => item.id === targetId)
    endDrag()

    const delta = reorderDelta(asset.items, from, to)
    if (delta) {
      onUpdate(asset, delta)
    }
  }

  const handleMove = (itemId: string, direction: -1 | 1) => {
    const from = asset.items.findIndex((item) => item.id === itemId)
    const delta = reorderDelta(asset.items, from, from + direction)
    if (delta) {
      onUpdate(asset, delta)
    }
  }

  return (
    <article className="todo-asset">
      <header className="todo-asset__header">
        <h2 className="todo-asset__title">{asset.title}</h2>
        <button
          type="button"
          className="todo-asset__delete"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${asset.title}`}
        >
          ×
        </button>
      </header>

      {asset.items.length === 0 ? <p className="todo-asset__empty">No items yet</p> : null}

      <ul className="todo-asset__items">
        {asset.items.map((item) => (
          <TodoItemRow
            key={item.id}
            item={item}
            isDragged={draggedId === item.id}
            isDropTarget={draggedId !== null && draggedId !== item.id && overId === item.id}
            onToggle={(isDone) => onUpdate(asset, setDoneDelta(item.id, isDone))}
            onRename={(text) => onUpdate(asset, editTextDelta(item.id, text))}
            onRemove={() => onUpdate(asset, deleteItemDelta(item.id))}
            onMove={(direction) => handleMove(item.id, direction)}
            onDragStart={() => setDraggedId(item.id)}
            onDragEnd={endDrag}
            onDragOver={() => setOverId(item.id)}
            onDrop={() => handleDropOn(item.id)}
          />
        ))}
      </ul>

      <input
        type="text"
        className="todo-asset__add"
        placeholder="Add item…"
        value={newText}
        maxLength={MAX_ITEM_TEXT_LENGTH}
        onChange={(event) => setNewText(event.target.value)}
        onBlur={handleAdd}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            handleAdd()
          }
        }}
        aria-label="Add item"
      />
    </article>
  )
}

export default TodoAsset
