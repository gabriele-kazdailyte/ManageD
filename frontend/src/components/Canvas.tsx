import type { AssetSnapshot } from '../api/assets'
import TodoAsset from './TodoAsset'
import './Canvas.css'

type CanvasProps = {
  assets: AssetSnapshot[]
  isLoading: boolean
  error: string | null
  deletingIds: ReadonlySet<string>
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDelete: (asset: AssetSnapshot) => void
}

function Canvas({ assets, isLoading, error, deletingIds, onDrop, onDelete }: CanvasProps) {
  // Each template type gets its own component; Todo is the only one so far.
  const renderAsset = (asset: AssetSnapshot) => {
    switch (asset.templateType) {
      case 'Todo':
        return (
          <TodoAsset
            key={asset.id}
            asset={asset}
            isDeleting={deletingIds.has(asset.id)}
            onDelete={onDelete}
          />
        )
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="canvas__empty">Loading…</div>
    }

    if (assets.length === 0) {
      return <div className="canvas__empty">Drop here</div>
    }

    return assets.map(renderAsset)
  }

  return (
    <section
      className={isLoading || assets.length === 0 ? 'canvas' : 'canvas canvas--filled'}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {error ? <p className="canvas__error">{error}</p> : null}
      {renderContent()}
    </section>
  )
}

export default Canvas
