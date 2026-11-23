import { beforeEach, describe, expect, it } from 'vitest'
import { loadViewport, saveViewport } from './boardViewport'

beforeEach(() => localStorage.clear())

describe('boardViewport', () => {
  it('round-trips per workspace', () => {
    saveViewport('w1', { x: 10, y: -20, zoom: 1.5 })
    expect(loadViewport('w1')).toEqual({ x: 10, y: -20, zoom: 1.5 })
    expect(loadViewport('w2')).toBeUndefined()
  })

  it('ignores corrupt data', () => {
    localStorage.setItem('board-viewport:w1', '{"x":"a"}')
    expect(loadViewport('w1')).toBeUndefined()
    localStorage.setItem('board-viewport:w1', 'nope')
    expect(loadViewport('w1')).toBeUndefined()
  })
})
