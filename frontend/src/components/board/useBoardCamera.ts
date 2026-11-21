import { useEffect, type RefObject } from 'react'
import { useReactFlow } from '@xyflow/react'
import { ZOOM_STEP, wheelZoom, zoomAround } from './boardCamera'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

// Excalidraw-style camera controls on top of React Flow:
// - Ctrl/Cmd + wheel and trackpad pinch zoom around the cursor in small, capped steps, applied instantly.
//   (React Flow's own pinch handler multiplies mouse-wheel deltas by 10 on macOS, so one notch jumps several levels.)
// - Ctrl/Cmd + = / − zoom in and out around the center, Ctrl/Cmd + 0 resets to 100%, Shift + 1 fits all cards,
//   while the mouse is over the board or focus is inside it. Elsewhere the browser keeps its own zoom.
// Plain wheel panning stays with React Flow (`panOnScroll`).
export function useBoardCamera(containerRef: RefObject<HTMLElement | null>) {
  const { getViewport, setViewport, fitView } = useReactFlow()

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const paneRect = () => (container.querySelector('.react-flow') ?? container).getBoundingClientRect()

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      // Capture phase: runs before React Flow's handler, which never sees the event.
      event.preventDefault()
      event.stopPropagation()
      const viewport = getViewport()
      const rect = paneRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      void setViewport(zoomAround(viewport, wheelZoom(viewport.zoom, event.deltaY, event.deltaMode), anchor))
    }

    const zoomAtCenter = (zoom: number) => {
      const rect = paneRect()
      void setViewport(zoomAround(getViewport(), zoom, { x: rect.width / 2, y: rect.height / 2 }))
    }

    // The shortcuts only apply while the mouse is over the board or focus is inside it. Elsewhere on the page,
    // Ctrl/Cmd + = / − / 0 stay with the browser's own zoom.
    const isOnBoard = () => container.matches(':hover') || container.contains(document.activeElement)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOnBoard() || isTyping(event.target) || document.querySelector('[aria-modal="true"]')) {
        return
      }
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        zoomAtCenter(getViewport().zoom * ZOOM_STEP)
      } else if (modifier && event.key === '-') {
        event.preventDefault()
        zoomAtCenter(getViewport().zoom / ZOOM_STEP)
      } else if (modifier && event.key === '0') {
        event.preventDefault()
        zoomAtCenter(1)
      } else if (!modifier && event.shiftKey && event.code === 'Digit1') {
        event.preventDefault()
        void fitView({ padding: 0.15, maxZoom: 1 })
      }
    }

    container.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true })
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, getViewport, setViewport, fitView])
}
