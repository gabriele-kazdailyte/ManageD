import type { AssetSnapshot, TemplateInfo } from '../api/assets'
import TodoAsset from './TodoAsset'
import './Canvas.css'

type CanvasProps = {
  assets: AssetSnapshot[]
  isLoading: boolean
  error: string | null
  deletingIds: ReadonlySet<string>
  templates: TemplateInfo[]
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDelete: (assetId: string) => void
  onSelectTemplate: (asset: AssetSnapshot, templateName: string | null) => void
}

function Canvas({
  assets,
  isLoading,
  error,
  deletingIds,
  templates,
  onDrop,
  onDelete,
  onSelectTemplate,
}: CanvasProps) {
  // Each template type gets its own component; Todo is the only one so far.
  const renderAsset = (asset: AssetSnapshot) => {
    switch (asset.templateType) {
      case 'Todo':
        return (
          <TodoAsset
            key={asset.id}
            asset={asset}
            isDeleting={deletingIds.has(asset.id)}
            templates={templates}
            onDelete={onDelete}
            onSelectTemplate={onSelectTemplate}
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
