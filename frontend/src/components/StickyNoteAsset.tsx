import { useEffect, useState } from 'react'
import type { AssetSnapshot } from '../api/assets'
import './StickyNoteAsset.css'

type StickyNoteAssetProps = {
  asset: AssetSnapshot
  isDeleting: boolean
  onDelete: (asset: AssetSnapshot) => void
  onSave: (assetId: string, content: string) => Promise<void>
}

function StickyNoteAsset({ asset, isDeleting, onDelete, onSave }: StickyNoteAssetProps) {
  const [content, setContent] = useState(asset.noteContent)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (content === asset.noteContent) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsSaving(true)
      setSaveError(null)
      onSave(asset.id, content)
        .catch((error: unknown) => {
          setSaveError(error instanceof Error ? error.message : 'Could not save the sticky note.')
        })
        .finally(() => setIsSaving(false))
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [asset.id, asset.noteContent, content, onSave])

  return (
    <article className="sticky-note">
      <header className="sticky-note__header">
        <h2 className="sticky-note__title">{asset.title}</h2>
        <button
          type="button"
          className="sticky-note__delete"
          onClick={() => onDelete(asset)}
          disabled={isDeleting}
          aria-label={`Delete ${asset.title}`}
        >
          ×
        </button>
      </header>
      <textarea
        className="sticky-note__content"
        value={content}
        maxLength={5000}
        placeholder="Write a note…"
        aria-label="Sticky note content"
        onChange={(event) => setContent(event.target.value)}
      />
      <p className="sticky-note__status" aria-live="polite">
        {saveError ?? (isSaving ? 'Saving…' : content !== asset.noteContent ? 'Unsaved changes' : 'Saved')}
      </p>
    </article>
  )
}

export default StickyNoteAsset
