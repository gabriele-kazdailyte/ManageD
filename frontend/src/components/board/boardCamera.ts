import type { Viewport } from '@xyflow/react'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

// One mouse-wheel notch (deltaY ≈ 100) is capped to this, so it zooms about 10% like Excalidraw.
// Trackpad pinches send many small deltas, so they stay smooth and proportional.
const MAX_WHEEL_STEP = 10
const ZOOM_PER_DELTA = 0.01
// Firefox reports wheel deltas in lines (deltaMode 1) instead of pixels.
const LINE_HEIGHT = 16
// Zoom factor for the keyboard shortcuts and the + / − buttons.
export const ZOOM_STEP = 1.1

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const clampZoom = (zoom: number) => clamp(zoom, MIN_ZOOM, MAX_ZOOM)

// The viewport after zooming to `zoom`, keeping the board point under `anchor` (pane pixels) fixed.
export function zoomAround(viewport: Viewport, zoom: number, anchor: { x: number; y: number }): Viewport {
  const next = clampZoom(zoom)
  const worldX = (anchor.x - viewport.x) / viewport.zoom
  const worldY = (anchor.y - viewport.y) / viewport.zoom
  return { x: anchor.x - worldX * next, y: anchor.y - worldY * next, zoom: next }
}

// The zoom level after one Ctrl/Cmd + wheel event (mouse wheel or trackpad pinch).
export function wheelZoom(zoom: number, deltaY: number, deltaMode: number): number {
  const pixels = deltaMode === 1 ? deltaY * LINE_HEIGHT : deltaY
  const step = clamp(pixels, -MAX_WHEEL_STEP, MAX_WHEEL_STEP)
  return clampZoom(zoom * Math.exp(-step * ZOOM_PER_DELTA))
}
