import type { AssetSnapshot, PresetInfo } from '../api/assets'
import TodoAsset from './TodoAsset'
import StickyNoteAsset from './StickyNoteAsset'
import './Canvas.css'

type CanvasProps = {
  assets: AssetSnapshot[]
  isLoading: boolean
  error: string | null
  deletingIds: ReadonlySet<string>
  presets: PresetInfo[]
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDelete: (asset: AssetSnapshot) => void
  onSelectPreset: (asset: AssetSnapshot, presetName: string | null) => void
  onSaveNote: (assetId: string, content: string) => Promise<void>
}

function Canvas({
  assets,
  isLoading,
  error,
  deletingIds,
  presets,
  onDrop,
  onDelete,
  onSelectPreset,
  onSaveNote,
}: CanvasProps) {
  const renderAsset = (asset: AssetSnapshot) => {
    switch (asset.templateType) {
      case 'Todo':
        return (
          <TodoAsset
            key={asset.id}
            asset={asset}
            isDeleting={deletingIds.has(asset.id)}
            presets={presets}
            onDelete={onDelete}
            onSelectPreset={onSelectPreset}
          />
        )
      case 'Note':
        return (
          <StickyNoteAsset
            key={asset.id}
            asset={asset}
            isDeleting={deletingIds.has(asset.id)}
            onDelete={onDelete}
            onSave={onSaveNote}
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
