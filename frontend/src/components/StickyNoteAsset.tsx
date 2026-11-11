import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { AssetDelta, AssetSnapshot } from '../api/assets'
import './StickyNoteAsset.css'

type StickyNoteAssetProps = {
  asset: AssetSnapshot
  isDeleting: boolean
  onDelete: (asset: AssetSnapshot) => void
  onUpdate: (asset: AssetSnapshot, delta: AssetDelta) => void
}

function StickyNoteAsset({ asset, isDeleting, onDelete, onUpdate }: StickyNoteAssetProps) {
  const [draft, setDraft] = useState({
    assetId: asset.id,
    savedContent: asset.noteContent,
    content: asset.noteContent,
  })
  const [isPreview, setIsPreview] = useState(true)
  const content =
    draft.assetId === asset.id && draft.savedContent === asset.noteContent
      ? draft.content
      : asset.noteContent

  useEffect(() => {
    if (content === asset.noteContent) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onUpdate(asset, { noteContent: content })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [asset, content, onUpdate])

  return (
    <article className="sticky-note">
      <header className="sticky-note__header">
        <h2 className="sticky-note__title">{asset.title}</h2>
        <button
          type="button"
          className="sticky-note__mode"
          onClick={() => setIsPreview((current) => !current)}
          aria-label={isPreview ? 'Edit note' : 'Preview Markdown'}
        >
          {isPreview ? 'Edit' : 'Preview'}
        </button>
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
      {isPreview ? (
        <div className="sticky-note__preview">
          {content ? <ReactMarkdown>{content}</ReactMarkdown> : <p>Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea
          className="sticky-note__content"
          value={content}
          maxLength={5000}
          placeholder="Write a note…"
          aria-label="Sticky note Markdown"
          onChange={(event) =>
            setDraft({
              assetId: asset.id,
              savedContent: asset.noteContent,
              content: event.target.value,
            })
          }
        />
      )}
      <p className="sticky-note__status" aria-live="polite">
        {content !== asset.noteContent ? 'Unsaved changes' : 'Saved'}
      </p>
    </article>
  )
}

export default StickyNoteAsset
