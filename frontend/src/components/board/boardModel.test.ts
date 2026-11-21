import { describe, expect, it } from 'vitest'
import type { AssetSnapshot } from '../../api/assets'
import { assetsToNodes, positionDelta, type AssetNode } from './boardModel'

const asset = (id: string, over: Partial<AssetSnapshot> = {}): AssetSnapshot => ({
  id,
  title: id,
  templateType: 'Todo',
  x: 0,
  y: 0,
  items: [],
  noteContent: '',
  ...over,
})

const none = new Set<string>()

describe('assetsToNodes', () => {
  it('maps both template types', () => {
    const nodes = assetsToNodes([asset('a', { x: 5, y: 6 }), asset('b', { templateType: 'Note', x: 7, y: 8 })], new Set(['b']))
    expect(nodes.map((n) => [n.id, n.type])).toEqual([['a', 'todo'], ['b', 'note']])
    expect(nodes[0].position).toEqual({ x: 5, y: 6 })
    expect(nodes[0].dragHandle).toBe('.asset-drag-handle')
    expect(nodes[0].data.isDeleting).toBe(false)
    expect(nodes[1].data.isDeleting).toBe(true)
  })

  it('keeps negative coordinates', () => {
    const [node] = assetsToNodes([asset('a', { x: -300, y: -40 })], none)
    expect(node.position).toEqual({ x: -300, y: -40 })
  })

  it('places an axis-aligned zero as saved, not unmoved', () => {
    const [node] = assetsToNodes([asset('a', { x: 0, y: 50 })], none)
    expect(node.position).toEqual({ x: 0, y: 50 })
  })

  it('gives unmoved cards grid slots ranked by id', () => {
    const nodes = assetsToNodes([asset('d'), asset('c'), asset('b'), asset('a')], none)
    const pos = Object.fromEntries(nodes.map((n) => [n.id, n.position]))
    expect(pos.a).toEqual({ x: 0, y: 0 })
    expect(pos.b).toEqual({ x: 280, y: 0 })
    expect(pos.c).toEqual({ x: 560, y: 0 })
    expect(pos.d).toEqual({ x: 0, y: 280 })
  })

  it('keeps fallback slots stable when an unrelated or moved card is deleted', () => {
    const all = [asset('a'), asset('b'), asset('m', { x: 10, y: 10 }), asset('c')]
    const before = assetsToNodes(all, none)
    const after = assetsToNodes(all.filter((a) => a.id !== 'm'), none)
    for (const id of ['a', 'b', 'c']) {
      expect(after.find((n) => n.id === id)!.position).toEqual(before.find((n) => n.id === id)!.position)
    }
  })

  it('keeps selection and drag position from the previous nodes', () => {
    const a = asset('a', { x: 100, y: 100 })
    const prev: AssetNode[] = [
      { ...assetsToNodes([a], none)[0], selected: true, dragging: true, position: { x: 130, y: 140 } },
      { ...assetsToNodes([asset('b', { x: 1, y: 1 })], none)[0], selected: true, position: { x: 999, y: 999 } },
    ]
    const nodes = assetsToNodes([a, asset('b', { x: 2, y: 2 }), asset('c', { x: 3, y: 3 })], none, prev)
    expect(nodes[0].selected).toBe(true)
    expect(nodes[0].dragging).toBe(true)
    expect(nodes[0].position).toEqual({ x: 130, y: 140 })
    // Selected but not dragging: server position wins, selection kept.
    expect(nodes[1].selected).toBe(true)
    expect(nodes[1].position).toEqual({ x: 2, y: 2 })
    expect(nodes[2].selected).toBeUndefined()
  })
})

describe('positionDelta', () => {
  it('rounds to whole numbers', () => {
    expect(positionDelta({ position: { x: 10.4, y: -20.6 } })).toEqual({ x: 10, y: -21 })
  })

  it('sends (1,1) instead of (0,0)', () => {
    expect(positionDelta({ position: { x: 0.2, y: -0.4 } })).toEqual({ x: 1, y: 1 })
  })

  it('keeps a single zero axis', () => {
    expect(positionDelta({ position: { x: 0, y: 5 } })).toEqual({ x: 0, y: 5 })
  })
})
