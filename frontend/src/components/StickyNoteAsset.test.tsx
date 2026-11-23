import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetSnapshot } from '../api/assets'
import StickyNoteAsset from './StickyNoteAsset'

const note = (noteContent: string): AssetSnapshot => ({
  id: 'note-1',
  title: 'Memo',
  templateType: 'Note',
  x: 0,
  y: 0,
  sizeX: 0,
  sizeY: 0,
  zPos: 0,
  items: [],
  noteContent,
})

function setup(noteContent = '') {
  const asset = note(noteContent)
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  render(<StickyNoteAsset asset={asset} isDeleting={false} onDelete={onDelete} onUpdate={onUpdate} />)
  return { asset, onUpdate, onDelete }
}

// One change event per character, like typing. The field is controlled, so each event appends to what is shown.
const type = (field: HTMLElement, text: string) => {
  const area = field as HTMLTextAreaElement
  for (const character of text) {
    fireEvent.change(area, { target: { value: area.value + character } })
  }
}

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Edit and Preview', () => {
  it('starts in preview and shows the rendered Markdown', () => {
    setup('# Title\n\n**bold**')

    expect(screen.getByRole('heading', { name: 'Title', level: 1 })).toBeTruthy()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.queryByLabelText('Sticky note Markdown')).toBeNull()
  })

  it('shows a hint when the note is empty', () => {
    setup('')

    expect(screen.getByText('Nothing to preview yet.')).toBeTruthy()
  })

  it('Edit switches to the Markdown field with the note, and Preview switches back', async () => {
    setup('hello')

    fireEvent.click(screen.getByLabelText('Edit note'))
    const field = screen.getByLabelText('Sticky note Markdown') as HTMLTextAreaElement
    expect(field.value).toBe('hello')
    expect(screen.getByLabelText('Preview Markdown').textContent).toBe('Preview')

    fireEvent.click(screen.getByLabelText('Preview Markdown'))
    expect(screen.queryByLabelText('Sticky note Markdown')).toBeNull()
    expect(screen.getByText('hello')).toBeTruthy()
    expect(screen.getByLabelText('Edit note').textContent).toBe('Edit')
  })

  it('keeps unsaved text when switching to Preview and back', async () => {
    setup('')

    fireEvent.click(screen.getByLabelText('Edit note'))
    type(screen.getByLabelText('Sticky note Markdown'), '*draft*')
    fireEvent.click(screen.getByLabelText('Preview Markdown'))

    expect(screen.getByText('draft').tagName).toBe('EM')
  })
})

describe('saving the note', () => {
  it('saves once, 500 ms after the last keystroke, with the full text', async () => {
    const { asset, onUpdate } = setup('')
    fireEvent.click(screen.getByLabelText('Edit note'))

    type(screen.getByLabelText('Sticky note Markdown'), 'abc')
    expect(onUpdate).not.toHaveBeenCalled()

    await advance(499)
    expect(onUpdate).not.toHaveBeenCalled()

    await advance(1)
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { noteContent: 'abc' })

    await advance(5000)
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('restarts the wait with each keystroke, so a pause shorter than 500 ms does not save', async () => {
    const { asset, onUpdate } = setup('')
    fireEvent.click(screen.getByLabelText('Edit note'))
    const field = screen.getByLabelText('Sticky note Markdown')

    type(field, 'a')
    await advance(400)
    type(field, 'b')
    await advance(400)
    expect(onUpdate).not.toHaveBeenCalled()

    await advance(100)
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(asset, { noteContent: 'ab' })
  })

  it('saves again after a second pause', async () => {
    const { onUpdate } = setup('')
    fireEvent.click(screen.getByLabelText('Edit note'))
    const field = screen.getByLabelText('Sticky note Markdown')

    type(field, 'one')
    await advance(500)
    type(field, ' two')
    await advance(500)

    expect(onUpdate.mock.calls.map((call) => call[1])).toEqual([{ noteContent: 'one' }, { noteContent: 'one two' }])
  })

  it('does not save when nothing changed', async () => {
    const { onUpdate } = setup('same')
    fireEvent.click(screen.getByLabelText('Edit note'))

    await advance(2000)

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('shows Saved at first and Unsaved changes after typing', async () => {
    setup('')
    expect(screen.getByText('Saved')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Edit note'))
    type(screen.getByLabelText('Sticky note Markdown'), 'x')

    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })
})

describe('card buttons', () => {
  it('delete asks to delete this note', async () => {
    const { asset, onDelete } = setup('x')

    fireEvent.click(screen.getByLabelText('Delete Memo'))

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(asset)
  })
})
