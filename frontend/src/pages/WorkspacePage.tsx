import { useEffect, useState } from 'react'
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

type WorkspaceCanvasProps = {
  workspaceId: string
}

function WorkspaceCanvas({ workspaceId }: WorkspaceCanvasProps) {
  const [assets, setAssets] = useState<AssetSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set())
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

  const handleDelete = async (assetId: string) => {
    setDeletingIds((current) => new Set(current).add(assetId))

    try {
      await deleteAsset(assetId)
      setAssets((current) => current.filter((asset) => asset.id !== assetId))
      setError(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete the asset.')
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current)
        next.delete(assetId)
        return next
      })
    }
  }

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
        onDelete={handleDelete}
        onSelectTemplate={handleSelectTemplate}
      />
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
