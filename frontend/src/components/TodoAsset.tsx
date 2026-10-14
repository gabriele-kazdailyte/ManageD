import type { AssetSnapshot } from '../api/assets'
import './TodoAsset.css'

type TodoAssetProps = {
  asset: AssetSnapshot
  isDeleting: boolean
  onDelete: (assetId: string) => void
}

// Read-only for now: items are added and edited through the hub, which doesn't exist yet.
function TodoAsset({ asset, isDeleting, onDelete }: TodoAssetProps) {
  const handleDelete = () => {
    if (window.confirm(`Delete "${asset.title}"?`)) {
      onDelete(asset.id)
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

      {asset.items.length === 0 ? (
        <p className="todo-asset__empty">No items yet</p>
      ) : (
        <ul className="todo-asset__items">
          {asset.items.map((item) => (
            <li key={item.id} className="todo-asset__item">
              <input type="checkbox" checked={item.isDone} disabled aria-label={item.text} />
              <span className={item.isDone ? 'todo-asset__text todo-asset__text--done' : 'todo-asset__text'}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default TodoAsset
