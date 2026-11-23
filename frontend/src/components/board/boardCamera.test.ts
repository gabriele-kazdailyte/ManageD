import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, MIN_ZOOM, wheelZoom, zoomAround } from './boardCamera'

describe('zoomAround', () => {
  it('keeps the board point under the cursor fixed', () => {
    const viewport = { x: 40, y: -20, zoom: 1.5 }
    const anchor = { x: 300, y: 200 }
    const worldBefore = { x: (anchor.x - viewport.x) / viewport.zoom, y: (anchor.y - viewport.y) / viewport.zoom }

    const next = zoomAround(viewport, 2.25, anchor)

    expect(next.zoom).toBe(2.25)
    expect((anchor.x - next.x) / next.zoom).toBeCloseTo(worldBefore.x)
    expect((anchor.y - next.y) / next.zoom).toBeCloseTo(worldBefore.y)
  })

  it('clamps the zoom level', () => {
    expect(zoomAround({ x: 0, y: 0, zoom: 1 }, 100, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM)
    expect(zoomAround({ x: 0, y: 0, zoom: 1 }, 0.001, { x: 0, y: 0 }).zoom).toBe(MIN_ZOOM)
  })
})

describe('wheelZoom', () => {
  it('zooms about 10% per mouse-wheel notch, in both directions', () => {
    expect(wheelZoom(1, -100, 0)).toBeCloseTo(Math.exp(0.1))
    expect(wheelZoom(1, 100, 0)).toBeCloseTo(Math.exp(-0.1))
  })

  it('zooms proportionally for small trackpad pinch deltas', () => {
    expect(wheelZoom(1, -2, 0)).toBeCloseTo(Math.exp(0.02))
  })

  it('treats line-based deltas (Firefox) as pixels', () => {
    expect(wheelZoom(1, -3, 1)).toBeCloseTo(Math.exp(0.1))
  })
})
