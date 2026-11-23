import type { Viewport } from '@xyflow/react'

const key = (workspaceId: string) => `board-viewport:${workspaceId}`

export function loadViewport(workspaceId: string): Viewport | undefined {
  try {
    const raw = localStorage.getItem(key(workspaceId))
    if (!raw) {
      return undefined
    }
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) {
      return undefined
    }
    const { x, y, zoom } = value as Record<string, unknown>
    if (typeof x === 'number' && typeof y === 'number' && typeof zoom === 'number' && [x, y, zoom].every(Number.isFinite) && zoom > 0) {
      return { x, y, zoom }
    }
  } catch {
    // Storage unavailable or corrupt: fall back to fitting the view.
  }
  return undefined
}

export function saveViewport(workspaceId: string, viewport: Viewport) {
  try {
    localStorage.setItem(key(workspaceId), JSON.stringify({ x: viewport.x, y: viewport.y, zoom: viewport.zoom }))
  } catch {
    // Ignore: the view just isn't remembered.
  }
}
