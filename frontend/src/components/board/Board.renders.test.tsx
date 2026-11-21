import { render } from '@testing-library/react'
import { beforeAll, expect, it, vi } from 'vitest'
import type { AssetSnapshot } from '../../api/assets'

const renders = vi.hoisted(() => ({ count: 0 }))
vi.mock('../TodoAsset', () => ({
  default: ({ asset }: { asset: AssetSnapshot }) => {
    renders.count++
    return <div>{asset.title}</div>
  },
}))

import Board from './Board'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1
  } as unknown as typeof DOMMatrixReadOnly
})

const assets: AssetSnapshot[] = [1, 2, 3].map((n) => ({
  id: `a${n}`,
  title: `T${n}`,
  templateType: 'Todo',
  x: n * 300,
  y: 10,
  sizeX: 0,
  sizeY: 0,
  zPos: 0,
  items: [],
  noteContent: '',
}))

it('does not re-render cards when the parent re-renders with new callbacks', () => {
  const props = { workspaceId: 'w', assets, isLoading: false, error: null, deletingIds: new Set<string>() }
  const { rerender } = render(
    <Board {...props} onDrop={() => {}} onDelete={() => {}} onUpdate={() => {}} />,
  )
  const before = renders.count
  rerender(<Board {...props} onDrop={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
  expect(renders.count).toBe(before)
})
