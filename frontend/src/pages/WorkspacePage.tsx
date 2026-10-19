import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  createAsset,
  deleteAsset,
  loadTemplates,
  loadWorkspaceAssets,
  type AssetSnapshot,
  type TemplateInfo,
} from '../api/assets'
import Toolbar from '../components/Toolbar'
import Canvas from '../components/Canvas'
import '../components/DeleteConfirmation.css'

type WorkspaceCanvasProps = {
  workspaceId: string
}

function WorkspaceCanvas({ workspaceId }: WorkspaceCanvasProps) {
  const [assets, setAssets] = useState<AssetSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set())
  const [assetToDelete, setAssetToDelete] = useState<AssetSnapshot | null>(null)
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false)
  const [confirmFutureDeletes, setConfirmFutureDeletes] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const deleteTriggerRef = useRef<HTMLElement | null>(null)
  const [templates, setTemplates] = useState<TemplateInfo[]>([])

  useEffect(() => {
    const controller = new AbortController()

    loadWorkspaceAssets(workspaceId, controller.signal)
      .then(setAssets)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load assets.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [workspaceId])

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
          setAssetToDelete(null)
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
    const controller = new AbortController()

    loadTemplates(controller.signal)
      .then(setTemplates)
      .catch(() => {
        if (!controller.signal.aborted) {
          setTemplates([])
        }
      })

    return () => controller.abort()
  }, [])

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    // dataTransfer can only be read while the drop event is being handled, so before any await.
    const label = event.dataTransfer.getData('application/todo-list')
    if (!label) {
      return
    }

    try {
      const createdAsset = await createAsset(workspaceId, label, 'Todo')
      setAssets((current) => [...current, createdAsset])
      setError(null)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create the asset.')
    }
  }

  const handleDelete = async (assetId: string, showDialogError = false) => {
    setDeletingIds((current) => new Set(current).add(assetId))

    try {
      await deleteAsset(assetId)
      setAssets((current) => current.filter((asset) => asset.id !== assetId))
      setError(null)
      setDeleteError(null)
      return true
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Could not delete the asset.'
      if (showDialogError) {
        setDeleteError(message)
      } else {
        setError(message)
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

  const handleRequestDelete = (asset: AssetSnapshot) => {
    if (skipDeleteConfirmation) {
      void handleDelete(asset.id)
      return
    }

    deleteTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmFutureDeletes(false)
    setDeleteError(null)
    setAssetToDelete(asset)
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
      setAssetToDelete(null)
  const handleSelectTemplate = async (asset: AssetSnapshot, templateName: string | null) => {
    try {
      const created = await createAsset(workspaceId, asset.title, 'Todo', templateName ?? undefined)
      await deleteAsset(asset.id)
      setAssets((current) => current.map((item) => (item.id === asset.id ? created : item)))
      setError(null)
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : 'Could not apply the template.')
    }
  }

  return (
    <>
      <Toolbar />
      <Canvas
        assets={assets}
        isLoading={isLoading}
        error={error}
        deletingIds={deletingIds}
        templates={templates}
        onDrop={handleDrop}
        onDelete={handleRequestDelete}
        onDelete={handleDelete}
        onSelectTemplate={handleSelectTemplate}
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
                  setAssetToDelete(null)
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

  // Keyed by workspace so switching workspaces starts from fresh state instead of briefly
  // showing the previous workspace's assets.
  return <WorkspaceCanvas key={workspaceId} workspaceId={workspaceId} />
}

export default WorkspacePage
