import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { AssetSnapshot } from '../../api/assets'
import Board from './Board'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1
    constructor() {}
  } as unknown as typeof DOMMatrixReadOnly
})

afterEach(cleanup)

it('renders cards as nodes', () => {
  render(
    <div style={{ width: 800, height: 600 }}>
      <Board
        workspaceId="w"
        assets={[
          { id: 'a', title: 'Groceries', templateType: 'Todo', x: 10, y: 10, sizeX: 0, sizeY: 0, zPos: 0, items: [], noteContent: '' },
          { id: 'b', title: 'Memo', templateType: 'Note', x: -50, y: 20, sizeX: 0, sizeY: 0, zPos: 0, items: [], noteContent: 'hi' },
        ]}
        isLoading={false}
        error={null}
        deletingIds={new Set()}
        onDrop={() => {}}
        onDelete={() => {}}
        onUpdate={() => {}}
      />
    </div>,
  )
  expect(screen.getByText('Groceries')).toBeTruthy()
  expect(screen.getByText('Memo')).toBeTruthy()
})

it('brings a card to front when it is clicked, but not when its × is clicked', () => {
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  const lower: AssetSnapshot = { id: 'a', title: 'Groceries', templateType: 'Todo', x: 10, y: 10, sizeX: 0, sizeY: 0, zPos: 0, items: [], noteContent: '' }
  const upper: AssetSnapshot = { ...lower, id: 'b', title: 'Chores', x: 300, zPos: 1 }
  render(
    <div style={{ width: 800, height: 600 }}>
      <Board
        workspaceId="w"
        assets={[lower, upper]}
        isLoading={false}
        error={null}
        deletingIds={new Set()}
        onDrop={() => {}}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </div>,
  )

  fireEvent.click(screen.getByLabelText('Delete Groceries'))
  expect(onUpdate).not.toHaveBeenCalled()

  fireEvent.click(screen.getByText('Groceries'))
  expect(onUpdate).toHaveBeenCalledExactlyOnceWith(lower, { zPos: 2 })
})
