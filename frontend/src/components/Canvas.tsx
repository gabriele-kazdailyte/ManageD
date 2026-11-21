import { useEffect, useRef, useState } from 'react'
import type { AssetDelta, AssetSnapshot } from '../api/assets'
import TodoAsset from './TodoAsset'
import StickyNoteAsset from './StickyNoteAsset'
import './Canvas.css'

type CanvasProps = {
  assets: AssetSnapshot[]
  isLoading: boolean
  error: string | null
  deletingIds: ReadonlySet<string>
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDelete: (asset: AssetSnapshot) => void
  onUpdate: (asset: AssetSnapshot, delta: AssetDelta) => void
}

function Canvas({ assets, isLoading, error, deletingIds, onDrop, onDelete, onUpdate }: CanvasProps) {
  const canvasRef = useRef<HTMLElement>(null)
  const assetElements = useRef(new Map<string, HTMLDivElement>())
  const [fitToCanvas, setFitToCanvas] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [assetSizes, setAssetSizes] = useState<Record<string, { width: number; height: number }>>({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const observer = new ResizeObserver(() => {
      const style = window.getComputedStyle(canvas)
      setCanvasSize({
        width: canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: canvas.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setAssetSizes((current) => {
        const next = { ...current }
        let changed = false
        for (const entry of entries) {
          const assetId = (entry.target as HTMLDivElement).dataset.assetId
          if (!assetId) {
            continue
          }
          const size = { width: entry.contentRect.width, height: entry.contentRect.height }
          if (current[assetId]?.width !== size.width || current[assetId]?.height !== size.height) {
            next[assetId] = size
            changed = true
          }
        }
        return changed ? next : current
      })
    })

    for (const asset of assets) {
      const element = assetElements.current.get(asset.id)
      if (element) {
        observer.observe(element)
      }
    }

    return () => observer.disconnect()
  }, [assets])

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    event.preventDefault()
    setFitToCanvas(false)
    setZoom((current) => Math.min(3, Math.max(0.15, current * Math.exp(-event.deltaY * 0.001))))
  }

  const getPosition = (asset: AssetSnapshot, index: number) => {
    const defaultX = (index % 3) * 280
    const defaultY = Math.floor(index / 3) * 280
    const hasSavedPosition = Number.isFinite(asset.x) && Number.isFinite(asset.y) && (asset.x !== 0 || asset.y !== 0)
    const x = hasSavedPosition ? asset.x : defaultX
    const y = hasSavedPosition ? asset.y : defaultY
    return { x, y }
  }

  const renderAsset = (asset: AssetSnapshot, index: number) => {
    const { x, y } = getPosition(asset, index)
    switch (asset.templateType) {
      case 'Todo':
        return (
          <div
            key={asset.id}
            ref={(element) => {
              if (element) {
                assetElements.current.set(asset.id, element)
              } else {
                assetElements.current.delete(asset.id)
              }
            }}
            data-asset-id={asset.id}
            className={`canvas__asset`}
            style={{ left: x, top: y }}
          >
            <TodoAsset
              asset={asset}
              isDeleting={deletingIds.has(asset.id)}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          </div>
        )
      case 'Note':
        return (
          <div
            key={asset.id}
            ref={(element) => {
              if (element) {
                assetElements.current.set(asset.id, element)
              } else {
                assetElements.current.delete(asset.id)
              }
            }}
            data-asset-id={asset.id}
            className={`canvas__asset`}
            style={{ left: x, top: y }}
          >
            <StickyNoteAsset
              asset={asset}
              isDeleting={deletingIds.has(asset.id)}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          </div>
        )
    }
  }

  const positions = assets.map(getPosition)
  const boardWidth = Math.max(
    100,
    ...positions.map(({ x }, index) => x + (assetSizes[assets[index].id]?.width ?? 260) + 20),
  )
  const boardHeight = Math.max(
    100,
    ...positions.map(({ y }, index) => y + (assetSizes[assets[index].id]?.height ?? 280) + 20),
  )
  const fittedScale = fitToCanvas && boardWidth > 0 && boardHeight > 0 && canvasSize.width > 0 && canvasSize.height > 0
    ? Math.min(canvasSize.width / boardWidth, canvasSize.height / boardHeight)
    : 1
  const scale = fitToCanvas ? fittedScale : zoom

  const renderContent = () => {
    if (isLoading) {
      return <div className="canvas__empty">Loading…</div>
    }

    if (assets.length === 0) {
      return <div className="canvas__empty">Drop here</div>
    }

    return (
      <div className="canvas__stage" style={{ width: boardWidth * scale, height: boardHeight * scale }}>
        <div className="canvas__board" style={{ width: boardWidth, height: boardHeight, transform: `scale(${scale})` }}>
          {assets.map(renderAsset)}
        </div>
      </div>
    )
  }

  return (
    <section
      ref={canvasRef}
      className={isLoading || assets.length === 0 ? 'canvas' : 'canvas canvas--filled'}
      onWheel={handleWheel}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {error ? <p className="canvas__error">{error}</p> : null}
      <label className="canvas__fit">
        <input
          type="checkbox"
          checked={fitToCanvas}
          onChange={(event) => setFitToCanvas(event.target.checked)}
        />
        Fit all components
      </label>
      {renderContent()}
    </section>
  )
}

export default Canvas
