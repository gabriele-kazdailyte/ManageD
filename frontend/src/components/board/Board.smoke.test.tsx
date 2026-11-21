import { render, screen } from '@testing-library/react'
import { beforeAll, expect, it } from 'vitest'
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
