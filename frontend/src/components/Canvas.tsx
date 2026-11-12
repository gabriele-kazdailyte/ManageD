import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AssetDelta, AssetSnapshot } from '../api/assets'
import TodoAsset from './TodoAsset'
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
  const [drag, setDrag] = useState<{
    asset: AssetSnapshot
    pointerId: number
    pointerStartX: number
    pointerStartY: number
    startX: number
    startY: number
    x: number
    y: number
  } | null>(null)

  const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    setDrag({
      ...drag,
      x: Math.max(0, drag.startX + event.clientX - drag.pointerStartX),
      y: Math.max(0, drag.startY + event.clientY - drag.pointerStartY),
    })
  }

  const endMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const x = Math.max(0, drag.startX + event.clientX - drag.pointerStartX)
    const y = Math.max(0, drag.startY + event.clientY - drag.pointerStartY)
    onUpdate(drag.asset, { x, y })
    setDrag(null)
  }

  const beginMove = (asset: AssetSnapshot, x: number, y: number, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      asset,
      pointerId: event.pointerId,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      startX: x,
      startY: y,
      x,
      y,
    })
  }

  const getPosition = (asset: AssetSnapshot, index: number) => {
    const defaultX = (index % 3) * 280
    const defaultY = Math.floor(index / 3) * 280
    const hasSavedPosition = Number.isFinite(asset.x) && Number.isFinite(asset.y) && (asset.x !== 0 || asset.y !== 0)
    const x = drag?.asset.id === asset.id ? drag.x : hasSavedPosition ? asset.x : defaultX
    const y = drag?.asset.id === asset.id ? drag.y : hasSavedPosition ? asset.y : defaultY
    return { x, y }
  }

  const renderAsset = (asset: AssetSnapshot, index: number) => {
    const { x, y } = getPosition(asset, index)
    switch (asset.templateType) {
      case 'Todo':
        return (
          <div
            key={asset.id}
            className={`canvas__asset${drag?.asset.id === asset.id ? ' canvas__asset--dragging' : ''}`}
            style={{ left: x, top: y }}
          >
            <TodoAsset
              asset={asset}
              isDeleting={deletingIds.has(asset.id)}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onMoveStart={(event) => beginMove(asset, x, y, event)}
              onMove={handleMove}
              onMoveEnd={endMove}
            />
          </div>
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

    const positions = assets.map(getPosition)
    const minWidth = Math.max(100, ...positions.map(({ x }) => x + 280))
    const minHeight = Math.max(100, ...positions.map(({ y }) => y + 280))

    return (
      <div
        className="canvas__board"
        style={{ minWidth: `max(100%, ${minWidth}px)`, minHeight: `max(100%, ${minHeight}px)` }}
      >
        {assets.map(renderAsset)}
      </div>
    )
  }

  return (
    <section
      className={isLoading || assets.length === 0 ? 'canvas' : 'canvas canvas--filled'}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {error ? <p className="canvas__error">{error}</p> : null}
      {isLoading || assets.length === 0 ? <div className="canvas__board">{renderContent()}</div> : renderContent()}
    </section>
  )
}

export default Canvas
