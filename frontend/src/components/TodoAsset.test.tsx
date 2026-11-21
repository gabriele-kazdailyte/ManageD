import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetSnapshot, TodoItem } from '../api/assets'
import TodoAsset from './TodoAsset'

const item = (id: string, order: number, overrides: Partial<TodoItem> = {}): TodoItem => ({
  id,
  text: `Task ${id}`,
  isDone: false,
  order,
  deadlineDate: null,
  completedDate: null,
  ...overrides,
})

const makeAsset = (items: TodoItem[]): AssetSnapshot => ({
  id: 'asset-1',
  title: 'Groceries',
  templateType: 'Todo',
  x: 0,
  y: 0,
  sizeX: 0,
  sizeY: 0,
  zPos: 0,
  items,
  noteContent: '',
})

function setup(items: TodoItem[] = [item('a', 0), item('b', 1)]) {
  const asset = makeAsset(items)
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  const user = userEvent.setup()
  render(<TodoAsset asset={asset} isDeleting={false} onDelete={onDelete} onUpdate={onUpdate} />)
  return { asset, onUpdate, onDelete, user }
}

beforeEach(() => {
  // Only the date is faked, so user-event's own timers keep working. Midday, away from any midnight.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('adding items', () => {
  it('Enter sends one added item after the highest order, and clears the field', async () => {
    const { asset, onUpdate, user } = setup([item('a', 0), item('b', 4)])
    const field = screen.getByLabelText('Add item') as HTMLInputElement

    await user.type(field, 'Buy milk{Enter}')

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith(asset, {
      added: [
        {
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          text: 'Buy milk',
          isDone: false,
          order: 5,
          deadlineDate: null,
          completedDate: null,
        },
      ],
    })
    expect(field.value).toBe('')
  })

  it('trims the text and also adds when the field loses focus', async () => {
    const { onUpdate, user } = setup([])

    await user.type(screen.getByLabelText('Add item'), '  Eggs  ')
    await user.tab()

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][1].added[0]).toMatchObject({ text: 'Eggs', order: 0 })
  })

  it('does not add an empty or blank item', async () => {
    const { onUpdate, user } = setup()

    await user.type(screen.getByLabelText('Add item'), '   {Enter}')
    await user.click(screen.getByLabelText('Add item'))
    await user.tab()

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('shows an empty message when there are no items', () => {
    setup([])

    expect(screen.getByText('No items yet')).toBeTruthy()
  })
})

describe('ticking items', () => {
  it('ticking sends isDone and today as the completed date', async () => {
    const { asset, onUpdate, user } = setup()

    await user.click(screen.getByLabelText('Mark "Task a" as done'))

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, {
      updated: [{ id: 'a', isDone: true, completedDate: '2026-11-21' }],
    })
  })

  it('unticking sends isDone false and clears the completed date', async () => {
    const { asset, onUpdate, user } = setup([item('a', 0, { isDone: true, completedDate: '2026-11-01' })])
    const box = screen.getByLabelText('Mark "Task a" as done') as HTMLInputElement
    expect(box.checked).toBe(true)

    await user.click(box)

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, {
      updated: [{ id: 'a', isDone: false, clearCompletedDate: true }],
    })
  })
})

describe('editing text', () => {
  const textboxes = () => screen.getAllByLabelText('Item text') as HTMLTextAreaElement[]

  it('Enter saves the new text of that item only', async () => {
    const { asset, onUpdate, user } = setup()

    await user.clear(textboxes()[1])
    await user.type(textboxes()[1], 'Renamed{Enter}')

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { updated: [{ id: 'b', text: 'Renamed' }] })
  })

  it('saves when the field loses focus, trimmed', async () => {
    const { asset, onUpdate, user } = setup()

    await user.clear(textboxes()[0])
    await user.type(textboxes()[0], '  Spaced  ')
    await user.tab()

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { updated: [{ id: 'a', text: 'Spaced' }] })
  })

  it('does not save while typing, only on commit', async () => {
    const { onUpdate, user } = setup()

    await user.type(textboxes()[0], ' more')

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('Escape cancels the edit and restores the old text', async () => {
    const { onUpdate, user } = setup()

    await user.type(textboxes()[0], ' changed{Escape}')

    expect(onUpdate).not.toHaveBeenCalled()
    expect(textboxes()[0].value).toBe('Task a')
  })

  it('does not save an unchanged or emptied text', async () => {
    const { onUpdate, user } = setup()

    await user.click(textboxes()[0])
    await user.tab()
    await user.clear(textboxes()[1])
    await user.tab()

    expect(onUpdate).not.toHaveBeenCalled()
  })
})

describe('deleting', () => {
  it('removing an item sends only that id as deleted', async () => {
    const { asset, onUpdate, user } = setup()

    await user.click(screen.getByLabelText('Remove "Task b"'))

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { deleted: ['b'] })
  })

  it('the card delete button asks to delete the card, and is disabled while deleting', async () => {
    const { asset, onDelete, user } = setup()

    await user.click(screen.getByLabelText('Delete Groceries'))

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(asset)

    cleanup()
    render(<TodoAsset asset={asset} isDeleting onDelete={onDelete} onUpdate={vi.fn()} />)
    expect((screen.getByLabelText('Delete Groceries') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('deadlines', () => {
  it('sends the deadline once the typed date is complete and valid', async () => {
    const { asset, onUpdate, user } = setup()

    await user.type(screen.getAllByPlaceholderText('YYYY/MM/DD')[0], '2026/12/24')

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { updated: [{ id: 'a', deadlineDate: '2026-12-24' }] })
  })

  it('sends nothing for an impossible date', async () => {
    const { onUpdate, user } = setup()

    await user.type(screen.getAllByPlaceholderText('YYYY/MM/DD')[0], '2026/02/30')

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('clearing the deadline sends clearDeadline', async () => {
    const { asset, onUpdate, user } = setup([item('a', 0, { deadlineDate: '2026-12-24' })])

    await user.click(screen.getByLabelText('Clear deadline for "Task a"'))

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { updated: [{ id: 'a', clearDeadline: true }] })
  })

  it('shows the saved deadline', () => {
    setup([item('a', 0, { deadlineDate: '2026-12-24' })])

    expect(screen.getByText('Due 2026/12/24')).toBeTruthy()
  })
})

describe('reordering with the keyboard', () => {
  it('ArrowDown on the handle swaps the item with the next one', async () => {
    const { asset, onUpdate, user } = setup()

    screen.getByLabelText('Reorder "Task a" with the arrow keys').focus()
    await user.keyboard('{ArrowDown}')

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, {
      updated: [
        { id: 'b', order: 0 },
        { id: 'a', order: 1 },
      ],
    })
  })

  it('ArrowUp on the first item sends nothing', async () => {
    const { onUpdate, user } = setup()

    screen.getByLabelText('Reorder "Task a" with the arrow keys').focus()
    await user.keyboard('{ArrowUp}')

    expect(onUpdate).not.toHaveBeenCalled()
  })
})
