import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDeadlineStatus } from './deadlineStatus'

const TODAY = '2026-11-21'

describe('getDeadlineStatus', () => {
  it('is null without a deadline, done or not', () => {
    expect(getDeadlineStatus({ isDone: false, deadlineDate: null, completedDate: null }, TODAY)).toBeNull()
    expect(getDeadlineStatus({ isDone: true, deadlineDate: null, completedDate: '2026-11-01' }, TODAY)).toBeNull()
  })

  it('is pending when not done and the deadline is today or later', () => {
    expect(getDeadlineStatus({ isDone: false, deadlineDate: '2026-11-21', completedDate: null }, TODAY)).toBe('pending')
    expect(getDeadlineStatus({ isDone: false, deadlineDate: '2026-11-22', completedDate: null }, TODAY)).toBe('pending')
  })

  it('is missed when not done and the deadline was yesterday or earlier', () => {
    expect(getDeadlineStatus({ isDone: false, deadlineDate: '2026-11-20', completedDate: null }, TODAY)).toBe('missed')
    expect(getDeadlineStatus({ isDone: false, deadlineDate: '2025-12-31', completedDate: null }, TODAY)).toBe('missed')
  })

  it('is on time when completed on or before the deadline', () => {
    expect(getDeadlineStatus({ isDone: true, deadlineDate: '2026-11-10', completedDate: '2026-11-10' }, TODAY)).toBe('on-time')
    expect(getDeadlineStatus({ isDone: true, deadlineDate: '2026-11-10', completedDate: '2026-11-01' }, TODAY)).toBe('on-time')
  })

  it('is late when completed after the deadline', () => {
    expect(getDeadlineStatus({ isDone: true, deadlineDate: '2026-11-10', completedDate: '2026-11-11' }, TODAY)).toBe('late')
  })

  it('treats a done item without a completed date as on time', () => {
    expect(getDeadlineStatus({ isDone: true, deadlineDate: '2026-01-01', completedDate: null }, TODAY)).toBe('on-time')
  })

  it('does not depend on today once an item is done', () => {
    expect(getDeadlineStatus({ isDone: true, deadlineDate: '2026-11-01', completedDate: '2026-11-01' }, '2030-01-01')).toBe('on-time')
  })
})

describe('getDeadlineStatus with the default date', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the local date of the (faked) clock', () => {
    vi.useFakeTimers()
    // Midday local time, so the local date is 2026-11-21 in any time zone
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 0))

    expect(getDeadlineStatus({ isDone: false, deadlineDate: '2026-11-21', completedDate: null })).toBe('pending')
    expect(getDeadlineStatus({ isDone: false, deadlineDate: '2026-11-20', completedDate: null })).toBe('missed')
  })
})
