import { describe, expect, it } from 'vitest'
import type { AssetSnapshot } from '../../api/assets'
import { assetsToNodes, bringToFrontDelta, newCardPosition, resizeDelta, positionDelta, type AssetNode } from './boardModel'

const asset = (id: string, over: Partial<AssetSnapshot> = {}): AssetSnapshot => ({
  id,
  title: id,
  templateType: 'Todo',
  x: 0,
  y: 0,
  sizeX: 0,
  sizeY: 0,
  zPos: 0,
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

describe('assetsToNodes reuse', () => {
  it('reuses unchanged node objects and keeps measured size', () => {
    const a = asset('a', { x: 5, y: 5 })
    const b = asset('b', { x: 9, y: 9 })
    const first = assetsToNodes([a, b], none)
    first[0] = { ...first[0], measured: { width: 260, height: 100 } }
    const b2 = { ...b, title: 'changed' }
    const second = assetsToNodes([a, b2], none, first)
    expect(second[0]).toBe(first[0])
    expect(second[1]).not.toBe(first[1])
    expect(second[1].data.asset).toBe(b2)
    const third = assetsToNodes([{ ...a, x: 6 }, b2], none, first)
    expect(third[0].measured).toEqual({ width: 260, height: 100 })
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

describe('size and z-order', () => {
  it('maps zPos to zIndex, including 0 and negatives', () => {
    const nodes = assetsToNodes([asset('a', { zPos: 0 }), asset('b', { zPos: 7 }), asset('c', { zPos: -2 })], none)
    expect(nodes.map((n) => n.zIndex)).toEqual([0, 7, -2])
  })

  it('maps sizes above 0 to width and height', () => {
    const [node] = assetsToNodes([asset('a', { sizeX: 320, sizeY: 240 })], none)
    expect(node.width).toBe(320)
    expect(node.height).toBe(240)
  })

  it('leaves width and height unset for auto size (0)', () => {
    const [node] = assetsToNodes([asset('a')], none)
    expect(node.width).toBeUndefined()
    expect(node.height).toBeUndefined()
  })

  it('treats each axis on its own', () => {
    const [node] = assetsToNodes([asset('a', { sizeX: 400 })], none)
    expect(node.width).toBe(400)
    expect(node.height).toBeUndefined()
  })

  it('updates a reused node when the size or z-order changes', () => {
    const first = assetsToNodes([asset('a')], none)
    const second = assetsToNodes([asset('a', { sizeX: 300, sizeY: 200, zPos: 3 })], none, first)
    expect(second[0]).not.toBe(first[0])
    expect([second[0].width, second[0].height, second[0].zIndex]).toEqual([300, 200, 3])
  })

  it('keeps the local size while the card is being resized', () => {
    const first = assetsToNodes([asset('a', { sizeX: 300, sizeY: 200 })], none)
    const resizing: AssetNode = { ...first[0], width: 450, height: 380, resizing: true }
    const [node] = assetsToNodes([asset('a', { sizeX: 300, sizeY: 200, zPos: 1 })], none, [resizing])
    expect([node.width, node.height, node.resizing]).toEqual([450, 380, true])
  })
})

describe('newCardPosition', () => {
  it('puts the anchor point at the given point, rounded', () => {
    expect(newCardPosition({ x: 500.4, y: 300.6 }, { x: 130, y: 20 })).toEqual({ x: 370, y: 281 })
  })

  it('allows negative positions', () => {
    expect(newCardPosition({ x: 10, y: 10 }, { x: 130, y: 20 })).toEqual({ x: -120, y: -10 })
  })

  it('never returns exactly (0,0), which means "unmoved"', () => {
    expect(newCardPosition({ x: 130, y: 20 }, { x: 130, y: 20 })).toEqual({ x: 1, y: 1 })
  })
})

describe('bringToFrontDelta', () => {
  it('sends one above the highest card when the card is not on top', () => {
    const assets = [asset('a', { zPos: 1 }), asset('b', { zPos: 5 }), asset('c', { zPos: 3 })]
    expect(bringToFrontDelta(assets, 'a')).toEqual({ zPos: 6 })
  })

  it('sends nothing when the card is already strictly on top', () => {
    const assets = [asset('a', { zPos: 6 }), asset('b', { zPos: 5 })]
    expect(bringToFrontDelta(assets, 'a')).toBeNull()
  })

  it('moves a card that only ties for the top', () => {
    expect(bringToFrontDelta([asset('a'), asset('b')], 'a')).toEqual({ zPos: 1 })
  })

  it('sends nothing for a lone card or an unknown id', () => {
    expect(bringToFrontDelta([asset('a')], 'a')).toBeNull()
    expect(bringToFrontDelta([asset('a')], 'zzz')).toBeNull()
  })

  it('works with negative z-orders', () => {
    expect(bringToFrontDelta([asset('a', { zPos: -3 }), asset('b', { zPos: -2 })], 'a')).toEqual({ zPos: -1 })
  })
})

describe('resizeDelta', () => {
  it('rounds the size and leaves the position out when it did not change', () => {
    expect(resizeDelta({ x: 10, y: 20 }, { x: 10, y: 20, width: 300.4, height: 199.6 })).toEqual({
      sizeX: 300,
      sizeY: 200,
    })
  })

  it('includes the position when a top or left edge moved it', () => {
    expect(resizeDelta({ x: 10, y: 20 }, { x: -40.2, y: 20, width: 350, height: 200 })).toEqual({
      sizeX: 350,
      sizeY: 200,
      x: -40,
      y: 20,
    })
  })
})
