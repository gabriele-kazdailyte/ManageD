import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadPresets, type AssetDelta, type AssetSnapshot, type PresetInfo } from '../api/assets'
import Toolbar from '../components/Toolbar'
import Canvas from '../components/Canvas'
import MembersPanel from '../components/MembersPanel'
import OnlineViewers from '../components/OnlineViewers'
import { useWorkspace } from '../context/WorkspaceContext'
import { WorkspaceProvider } from '../context/WorkspaceProvider'
import '../components/DeleteConfirmation.css'

type WorkspaceCanvasProps = {
  workspaceId: string
}

function WorkspaceCanvas({ workspaceId }: WorkspaceCanvasProps) {
  const {
    assets,
    viewers,
    isLoading,
    error: workspaceError,
    connectionStatus,
    createAsset,
    deleteAsset,
    updateAsset,
  } = useWorkspace()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set())
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false)
  const [confirmFutureDeletes, setConfirmFutureDeletes] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const deleteTriggerRef = useRef<HTMLElement | null>(null)
  const [presets, setPresets] = useState<PresetInfo[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const assetToDelete = deleteTargetId ? assets.find((asset) => asset.id === deleteTargetId) ?? null : null

  const statusMessage =
    connectionStatus === 'reconnecting'
      ? 'Connection lost. Reconnecting…'
      : connectionStatus === 'disconnected'
        ? 'Disconnected from the server. Reload the page to reconnect.'
        : null

  useEffect(() => {
    if (assetToDelete) {
      cancelButtonRef.current?.focus()
    } else if (deleteTriggerRef.current?.isConnected) {
      deleteTriggerRef.current.focus()
    }
  }, [assetToDelete])

  useEffect(() => {
    if (!assetToDelete) {
      return
    }

    const handleDialogKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!deletingIds.has(assetToDelete.id)) {
          event.preventDefault()
          setDeleteTargetId(null)
          setDeleteError(null)
        }
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = [
        cancelButtonRef.current,
        checkboxRef.current,
        confirmButtonRef.current,
      ].filter(
        (element): element is HTMLButtonElement | HTMLInputElement =>
          element !== null && !element.disabled,
      )
      const dialog = dialogRef.current
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement
      if (activeElement === dialog || !dialog?.contains(activeElement)) {
        event.preventDefault()
        const targetElement = event.shiftKey ? lastElement : firstElement
        targetElement.focus()
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => document.removeEventListener('keydown', handleDialogKeyDown)
  }, [assetToDelete, deletingIds])

  useEffect(() => {
    const controller = new AbortController()

    loadPresets(controller.signal)
      .then(setPresets)
      .catch(() => {
        if (!controller.signal.aborted) {
          setPresets([])
        }
      })

    return () => controller.abort()
  }, [])

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    // dataTransfer can only be read while the drop event is being handled, so before any await.
    const todoLabel = event.dataTransfer.getData('application/todo-list')
    const noteLabel = event.dataTransfer.getData('application/sticky-note')
    const templateType = noteLabel ? 'Note' : 'Todo'
    const label = noteLabel || todoLabel
    if (!label) {
      return
    }

    try {
      // The new asset shows up when the server's AssetCreated event arrives.
      await createAsset(label, templateType === 'Todo' ? selectedPreset : null, templateType)
      setActionError(null)
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Could not create the asset.')
    }
  }

  const handleDelete = async (assetId: string, showDialogError = false) => {
    setDeletingIds((current) => new Set(current).add(assetId))

    try {
      // The asset disappears when the server's AssetDeleted event arrives.
      await deleteAsset(assetId)
      setActionError(null)
      setDeleteError(null)
      return true
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Could not delete the asset.'
      if (showDialogError) {
        setDeleteError(message)
      } else {
        setActionError(message)
      }
      return false
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current)
        next.delete(assetId)
        return next
      })
    }
  }

  const handleUpdate = (asset: AssetSnapshot, delta: AssetDelta) => {
    // The change is already visible; this only reports a failure (the provider reloads the server's state).
    updateAsset(asset.id, delta)
      .then(() => setActionError(null))
      .catch((updateError: unknown) => {
        setActionError(updateError instanceof Error ? updateError.message : 'Could not save the change.')
      })
  }

  const handleRequestDelete = (asset: AssetSnapshot) => {
    if (skipDeleteConfirmation) {
      void handleDelete(asset.id)
      return
    }

    deleteTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmFutureDeletes(false)
    setDeleteError(null)
    setDeleteTargetId(asset.id)
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete) {
      return
    }

    const deleted = await handleDelete(assetToDelete.id, true)
    if (deleted) {
      if (confirmFutureDeletes) {
        setSkipDeleteConfirmation(true)
      }
      setDeleteTargetId(null)
    }
  }

  return (
    <>
      <MembersPanel workspaceId={workspaceId} />
      <OnlineViewers viewers={viewers} />
      <Toolbar
        presets={presets}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        onCreateNote={() => {
          createAsset('Sticky Note', null, 'Note').catch((createError: unknown) =>
            setActionError(createError instanceof Error ? createError.message : 'Could not create the sticky note.'),
          )
        }}
      />
      <Canvas
        assets={assets}
        isLoading={isLoading}
        error={actionError ?? workspaceError ?? statusMessage}
        deletingIds={deletingIds}
        onDrop={handleDrop}
        onDelete={handleRequestDelete}
        onUpdate={handleUpdate}
      />
      {assetToDelete ? (
        <div className="delete-dialog__backdrop">
          <section
            className="delete-dialog"
            ref={dialogRef}
            role="alertdialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="asset-delete-title"
            aria-describedby="asset-delete-description"
          >
            <span className="delete-dialog__icon" aria-hidden="true">!</span>
            <h2 id="asset-delete-title">Delete item?</h2>
            <p id="asset-delete-description">
              Are you sure you want to delete <strong>{assetToDelete.title}</strong>? This action cannot be undone.
            </p>
            {deleteError ? <p className="delete-dialog__error" role="alert">{deleteError}</p> : null}
            <label className="delete-dialog__option">
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={confirmFutureDeletes}
                onChange={(event) => setConfirmFutureDeletes(event.target.checked)}
                disabled={deletingIds.has(assetToDelete.id)}
              />
              Don’t ask again for now
            </label>
            <div className="delete-dialog__actions">
              <button
                type="button"
                className="delete-dialog__cancel"
                ref={cancelButtonRef}
                onClick={() => {
                  setDeleteTargetId(null)
                  setDeleteError(null)
                }}
                disabled={deletingIds.has(assetToDelete.id)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-dialog__confirm"
                ref={confirmButtonRef}
                onClick={handleConfirmDelete}
                disabled={deletingIds.has(assetToDelete.id)}
              >
                {deletingIds.has(assetToDelete.id) ? 'Deleting…' : 'Delete item'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

function WorkspacePage() {
  const { workspaceId } = useParams()

  if (!workspaceId) {
    return null
  }

  return (
    <WorkspaceProvider key={workspaceId} workspaceId={workspaceId}>
      <WorkspaceCanvas workspaceId={workspaceId} />
    </WorkspaceProvider>
  )
}

export default WorkspacePage
