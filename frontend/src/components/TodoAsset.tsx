import type { AssetSnapshot, PresetInfo } from '../api/assets'
import './TodoAsset.css'

type TodoAssetProps = {
  asset: AssetSnapshot
  isDeleting: boolean
  onDelete: (asset: AssetSnapshot) => void
  presets: PresetInfo[]
  onSelectPreset: (asset: AssetSnapshot, presetName: string | null) => void
}

// Read-only for now: items are added and edited through the hub, which doesn't exist yet.
function TodoAsset({ asset, isDeleting, presets, onDelete, onSelectPreset }: TodoAssetProps) {
  const handleDelete = () => {
    onDelete(asset)
  }

  return (
    <article className="todo-asset">
      <header className="todo-asset__header">
        <h2 className="todo-asset__title">{asset.title}</h2>
        <select
          className="todo-asset__preset"
          defaultValue="custom"
          onChange={(event) =>
            onSelectPreset(asset, event.target.value === 'custom' ? null : event.target.value)
          }
          aria-label="Fill from preset"
        >
          <option value="custom">Presets</option>
          {presets.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
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
