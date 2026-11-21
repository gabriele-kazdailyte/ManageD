import { describe, expect, it } from 'vitest'
import type { AssetSnapshot } from '../api/assets'
import { applyDelta } from './applyDelta'

const asset: AssetSnapshot = {
  id: 'a',
  title: 'A',
  templateType: 'Todo',
  x: 10,
  y: 20,
  sizeX: 300,
  sizeY: 200,
  zPos: 2,
  items: [],
  noteContent: '',
}

describe('applyDelta layout fields', () => {
  it('sets size and z-order', () => {
    const result = applyDelta(asset, { sizeX: 400, sizeY: 250, zPos: 9 })
    expect([result.sizeX, result.sizeY, result.zPos]).toEqual([400, 250, 9])
  })

  it('leaves fields that are omitted or null unchanged', () => {
    const result = applyDelta(asset, { sizeX: null, zPos: undefined, title: 'B' })
    expect([result.sizeX, result.sizeY, result.zPos, result.title]).toEqual([300, 200, 2, 'B'])
  })

  it('applies 0 (auto size and bottom of the stack) instead of ignoring it', () => {
    const result = applyDelta(asset, { sizeX: 0, sizeY: 0, zPos: 0 })
    expect([result.sizeX, result.sizeY, result.zPos]).toEqual([0, 0, 0])
  })

  it('applying the same delta twice gives the same result', () => {
    const delta = { x: 1, y: 2, sizeX: 500, zPos: 4 }
    expect(applyDelta(applyDelta(asset, delta), delta)).toEqual(applyDelta(asset, delta))
  })
})
