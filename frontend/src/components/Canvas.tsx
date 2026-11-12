import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
    pointerX: number
    pointerY: number
    x: number
    y: number
  } | null>(null)
  const dragRef = useRef(drag)

  useEffect(() => {
    if (!drag) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const current = dragRef.current
      if (!current) {
        return
      }

      const next = {
        ...current,
        x: Math.max(1, current.x + event.clientX - current.pointerX),
        y: Math.max(1, current.y + event.clientY - current.pointerY),
        pointerX: event.clientX,
        pointerY: event.clientY,
      }
      dragRef.current = next
      setDrag(next)
    }
    const handlePointerUp = () => {
      const current = dragRef.current
      if (current) {
        onUpdate(current.asset, { x: current.x, y: current.y })
        dragRef.current = null
        setDrag(null)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [drag, onUpdate])

  const beginMove = (asset: AssetSnapshot, x: number, y: number, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) {
      return
    }

    event.preventDefault()
    const next = { asset, x, y, pointerX: event.clientX, pointerY: event.clientY }
    dragRef.current = next
    setDrag(next)
  }

  const renderAsset = (asset: AssetSnapshot, index: number) => {
    const defaultX = (index % 3) * 280
    const defaultY = Math.floor(index / 3) * 280
    const x = drag?.asset.id === asset.id ? drag.x : asset.x === 0 && asset.y === 0 ? defaultX : asset.x
    const y = drag?.asset.id === asset.id ? drag.y : asset.x === 0 && asset.y === 0 ? defaultY : asset.y

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

    return assets.map(renderAsset)
  }

  return (
    <section
      className={isLoading || assets.length === 0 ? 'canvas' : 'canvas canvas--filled'}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {error ? <p className="canvas__error">{error}</p> : null}
      <div className="canvas__board">{renderContent()}</div>
    </section>
  )
}

export default Canvas
