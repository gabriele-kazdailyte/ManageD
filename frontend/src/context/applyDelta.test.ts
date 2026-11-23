import { describe, expect, it } from 'vitest'
import type { AssetSnapshot, TodoItem } from '../api/assets'
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

const item = (id: string, order: number, overrides: Partial<TodoItem> = {}): TodoItem => ({
  id,
  text: `text ${id}`,
  isDone: false,
  order,
  deadlineDate: null,
  completedDate: null,
  ...overrides,
})

const withItems = (...items: TodoItem[]): AssetSnapshot => ({ ...asset, items })

describe('applyDelta text fields', () => {
  it('sets the title, position and note content, leaving the rest alone', () => {
    const result = applyDelta(asset, { title: 'New', x: -5, y: 7, noteContent: '# hi' })

    expect(result).toEqual({ ...asset, title: 'New', x: -5, y: 7, noteContent: '# hi' })
  })

  it('keeps an empty note content instead of ignoring it', () => {
    const result = applyDelta({ ...asset, noteContent: 'old' }, { noteContent: '' })

    expect(result.noteContent).toBe('')
  })

  it('does not change the original asset', () => {
    const original = withItems(item('i1', 0))

    applyDelta(original, { title: 'X', updated: [{ id: 'i1', text: 'changed' }] })

    expect(original.title).toBe('A')
    expect(original.items[0].text).toBe('text i1')
  })
})

describe('applyDelta items', () => {
  it('adds items and sorts them by order', () => {
    const result = applyDelta(withItems(item('i1', 0), item('i3', 2)), { added: [item('i2', 1)] })

    expect(result.items.map((i) => i.id)).toEqual(['i1', 'i2', 'i3'])
  })

  it('ignores an added item whose id already exists', () => {
    const result = applyDelta(withItems(item('i1', 0)), { added: [item('i1', 5, { text: 'duplicate' })] })

    expect(result.items).toEqual([item('i1', 0)])
  })

  it('breaks ties between equal orders by id', () => {
    const result = applyDelta(withItems(item('b', 0)), { added: [item('a', 0), item('c', 0)] })

    expect(result.items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('updates only the fields that were sent', () => {
    const start = withItems(item('i1', 0, { deadlineDate: '2026-12-01' }), item('i2', 1))

    const result = applyDelta(start, { updated: [{ id: 'i1', text: 'edited', isDone: true }] })

    expect(result.items[0]).toEqual(item('i1', 0, { text: 'edited', isDone: true, deadlineDate: '2026-12-01' }))
    expect(result.items[1]).toEqual(item('i2', 1))
  })

  it('applies false, empty text and order 0 instead of ignoring them', () => {
    const start = withItems(item('i1', 3, { isDone: true, text: 'x' }))

    const result = applyDelta(start, { updated: [{ id: 'i1', text: '', isDone: false, order: 0 }] })

    expect(result.items[0]).toMatchObject({ text: '', isDone: false, order: 0 })
  })

  it('re-sorts after an order change', () => {
    const result = applyDelta(withItems(item('i1', 0), item('i2', 1)), { updated: [{ id: 'i1', order: 5 }] })

    expect(result.items.map((i) => i.id)).toEqual(['i2', 'i1'])
  })

  it('sets and clears the deadline', () => {
    const set = applyDelta(withItems(item('i1', 0)), { updated: [{ id: 'i1', deadlineDate: '2026-12-24' }] })
    const cleared = applyDelta(set, { updated: [{ id: 'i1', clearDeadline: true }] })

    expect(set.items[0].deadlineDate).toBe('2026-12-24')
    expect(cleared.items[0].deadlineDate).toBeNull()
  })

  it('sets and clears the completed date', () => {
    const set = applyDelta(withItems(item('i1', 0)), { updated: [{ id: 'i1', completedDate: '2026-11-20' }] })
    const cleared = applyDelta(set, { updated: [{ id: 'i1', clearCompletedDate: true }] })

    expect(set.items[0].completedDate).toBe('2026-11-20')
    expect(cleared.items[0].completedDate).toBeNull()
  })

  it('clearing wins over a date sent in the same change', () => {
    const start = withItems(item('i1', 0, { deadlineDate: '2026-12-01' }))

    const result = applyDelta(start, { updated: [{ id: 'i1', deadlineDate: '2026-12-31', clearDeadline: true }] })

    expect(result.items[0].deadlineDate).toBeNull()
  })

  it('ignores an update for an item that does not exist', () => {
    const start = withItems(item('i1', 0))

    expect(applyDelta(start, { updated: [{ id: 'nope', text: 'x' }] }).items).toEqual(start.items)
  })

  it('deletes items and ignores unknown ids', () => {
    const result = applyDelta(withItems(item('i1', 0), item('i2', 1)), { deleted: ['i1', 'nope'] })

    expect(result.items.map((i) => i.id)).toEqual(['i2'])
  })

  it('deletes first, so an update for an item deleted in the same delta is skipped', () => {
    const result = applyDelta(withItems(item('i1', 0)), { deleted: ['i1'], updated: [{ id: 'i1', text: 'zombie' }] })

    expect(result.items).toEqual([])
  })

  it('an item deleted and added again in one delta ends up as the added copy', () => {
    const result = applyDelta(withItems(item('i1', 0)), { deleted: ['i1'], added: [item('i1', 0, { text: 'fresh' })] })

    expect(result.items).toEqual([item('i1', 0, { text: 'fresh' })])
  })

  it('applying an item delta twice gives the same result', () => {
    const start = withItems(item('i1', 0), item('i2', 1))
    const delta = { added: [item('i3', 2)], updated: [{ id: 'i1', isDone: true }], deleted: ['i2'] }

    expect(applyDelta(applyDelta(start, delta), delta)).toEqual(applyDelta(start, delta))
  })
})
