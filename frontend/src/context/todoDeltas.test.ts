import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TodoItem } from '../api/assets'
import {
  addItemDelta,
  deleteItemDelta,
  editTextDelta,
  reorderDelta,
  setDeadlineDelta,
  setDoneDelta,
} from './todoDeltas'

const item = (id: string, order: number): TodoItem => ({
  id,
  text: id,
  isDone: false,
  order,
  deadlineDate: null,
  completedDate: null,
})

describe('addItemDelta', () => {
  it('adds one open item with a new id, after the highest order', () => {
    const delta = addItemDelta([item('a', 0), item('b', 7), item('c', 3)], 'Buy milk')

    expect(delta.added).toHaveLength(1)
    expect(delta.added![0]).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      text: 'Buy milk',
      isDone: false,
      order: 8,
      deadlineDate: null,
      completedDate: null,
    })
    expect(Object.keys(delta)).toEqual(['added'])
  })

  it('starts at order 0 for an empty list', () => {
    expect(addItemDelta([], 'First').added![0].order).toBe(0)
  })

  it('gives every item its own id', () => {
    expect(addItemDelta([], 'x').added![0].id).not.toBe(addItemDelta([], 'x').added![0].id)
  })
})

describe('editTextDelta', () => {
  it('changes only the text of that item', () => {
    expect(editTextDelta('i1', 'New text')).toEqual({ updated: [{ id: 'i1', text: 'New text' }] })
  })
})

describe('setDoneDelta', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Midday local time, so the date is the same in UTC and in local time anywhere near Europe.
    // setDoneDelta uses the UTC date (see "Known bugs" in docs/plan-testing-deadline2.md), so this stays away from midnight.
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticking sets the completed date to today', () => {
    expect(setDoneDelta('i1', true)).toEqual({
      updated: [{ id: 'i1', isDone: true, completedDate: '2026-11-21' }],
    })
  })

  it('unticking clears the completed date', () => {
    expect(setDoneDelta('i1', false)).toEqual({
      updated: [{ id: 'i1', isDone: false, clearCompletedDate: true }],
    })
  })
})

describe('setDeadlineDelta', () => {
  it('sets the deadline date', () => {
    expect(setDeadlineDelta('i1', '2026-12-24')).toEqual({ updated: [{ id: 'i1', deadlineDate: '2026-12-24' }] })
  })

  it('clears the deadline for null', () => {
    expect(setDeadlineDelta('i1', null)).toEqual({ updated: [{ id: 'i1', clearDeadline: true }] })
  })
})

describe('deleteItemDelta', () => {
  it('deletes by id', () => {
    expect(deleteItemDelta('i1')).toEqual({ deleted: ['i1'] })
  })
})

describe('reorderDelta', () => {
  const list = [item('a', 0), item('b', 1), item('c', 2), item('d', 3)]

  it('moving down swaps the order values of the items in between and leaves the rest', () => {
    expect(reorderDelta(list, 0, 2)).toEqual({
      updated: [
        { id: 'b', order: 0 },
        { id: 'c', order: 1 },
        { id: 'a', order: 2 },
      ],
    })
  })

  it('moving up shifts the items in between down', () => {
    expect(reorderDelta(list, 3, 1)).toEqual({
      updated: [
        { id: 'd', order: 1 },
        { id: 'b', order: 2 },
        { id: 'c', order: 3 },
      ],
    })
  })

  it('swapping neighbours changes just two items', () => {
    expect(reorderDelta(list, 1, 2)).toEqual({
      updated: [
        { id: 'c', order: 1 },
        { id: 'b', order: 2 },
      ],
    })
  })

  it('reuses the existing order values when they have gaps', () => {
    const gaps = [item('a', 10), item('b', 20), item('c', 30)]

    expect(reorderDelta(gaps, 2, 0)).toEqual({
      updated: [
        { id: 'c', order: 10 },
        { id: 'a', order: 20 },
        { id: 'b', order: 30 },
      ],
    })
  })

  it('renumbers from 0 when order values are duplicated, sending only items whose order changes', () => {
    const ties = [item('a', 0), item('b', 0), item('c', 0)]

    expect(reorderDelta(ties, 2, 0)).toEqual({
      updated: [
        { id: 'a', order: 1 },
        { id: 'b', order: 2 },
      ],
    })
  })

  it.each([
    ['the same position', 1, 1],
    ['a negative index', -1, 1],
    ['a negative target', 1, -1],
    ['a source past the end', 4, 1],
    ['a target past the end', 1, 4],
  ])('returns null for %s', (_name, from, to) => {
    expect(reorderDelta(list, from, to)).toBeNull()
  })
})
