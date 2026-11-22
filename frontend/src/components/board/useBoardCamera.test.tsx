import { act, cleanup, render } from '@testing-library/react'
import { ReactFlow, ReactFlowProvider, useReactFlow, type ReactFlowInstance } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_ZOOM, ZOOM_STEP, wheelZoom, zoomAround } from './boardCamera'
import { useBoardCamera } from './useBoardCamera'

const PANE = { width: 800, height: 600 }

let flow: ReactFlowInstance

// jsdom has no layout, so React Flow can't really fit a view. The real instance is used for zooming,
// and fitView is replaced by a spy to check that the shortcut asks for it with the right options.
const { fitViewSpy } = vi.hoisted(() => ({ fitViewSpy: vi.fn() }))

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return { ...actual, useReactFlow: () => ({ ...actual.useReactFlow(), fitView: fitViewSpy }) }
})

function Harness() {
  const containerRef = useRef<HTMLDivElement>(null)
  useBoardCamera(containerRef)
  const instance = useReactFlow()
  useEffect(() => {
    flow = instance
  })

  return (
    <div ref={containerRef} data-testid="container" style={PANE}>
      <ReactFlow nodes={[]} edges={[]} />
    </div>
  )
}

function mount() {
  const view = render(
    <ReactFlowProvider>
      <Harness />
    </ReactFlowProvider>,
  )
  return { container: view.getByTestId('container'), unmount: view.unmount }
}

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

beforeEach(() => {
  // jsdom has no layout, so every element would measure 0 x 0
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: PANE.width,
    bottom: PANE.height,
    width: PANE.width,
    height: PANE.height,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  // Unmounts every harness, so listeners from one test don't answer the next test's events
  cleanup()
  fitViewSpy.mockClear()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const setStartViewport = async (viewport: { x: number; y: number; zoom: number }) => {
  await act(async () => {
    await flow.setViewport(viewport)
  })
}

const wheel = (container: HTMLElement, init: WheelEventInit) => {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  act(() => {
    container.dispatchEvent(event)
  })
  return event
}

const keydown = async (init: KeyboardEventInit, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  await act(async () => {
    target.dispatchEvent(event)
  })
  return event
}

describe('useBoardCamera wheel zoom', () => {
  it('Ctrl + wheel zooms around the cursor and is kept from React Flow', async () => {
    const { container } = mount()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    const event = wheel(container, { ctrlKey: true, deltaY: -100, clientX: 400, clientY: 300 })

    await vi.waitFor(() => {
      expect(flow.getViewport()).toEqual(zoomAround({ x: 0, y: 0, zoom: 1 }, wheelZoom(1, -100, 0), { x: 400, y: 300 }))
    })
    expect(flow.getViewport().zoom).toBeGreaterThan(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('Cmd + wheel works too, and wheel down zooms out', async () => {
    const { container } = mount()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    wheel(container, { metaKey: true, deltaY: 100, clientX: 0, clientY: 0 })

    await vi.waitFor(() => expect(flow.getViewport().zoom).toBeLessThan(1))
    expect(flow.getViewport().zoom).toBeCloseTo(wheelZoom(1, 100, 0))
  })

  it('a plain wheel is left alone', async () => {
    const { container } = mount()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    const event = wheel(container, { deltaY: -100, clientX: 400, clientY: 300 })

    expect(event.defaultPrevented).toBe(false)
    expect(flow.getViewport()).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('stops zooming in at the maximum zoom', async () => {
    const { container } = mount()
    await setStartViewport({ x: 0, y: 0, zoom: MAX_ZOOM })

    wheel(container, { ctrlKey: true, deltaY: -100, clientX: 0, clientY: 0 })

    await vi.waitFor(() => expect(flow.getViewport().zoom).toBe(MAX_ZOOM))
  })
})

describe('useBoardCamera keyboard shortcuts', () => {
  const center = { x: PANE.width / 2, y: PANE.height / 2 }

  // The shortcuts only apply while the mouse is over the board or focus is inside it.
  const screenContainer = () => document.querySelector<HTMLElement>('[data-testid="container"]')!
  const mountWithFocus = () => {
    const mounted = mount()
    mounted.container.tabIndex = -1
    mounted.container.focus()
    return mounted
  }

  it('leaves the shortcuts to the browser when neither the mouse nor focus is on the board', async () => {
    mount()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    const zoomIn = await keydown({ key: '=', ctrlKey: true })
    const fit = await keydown({ key: '!', code: 'Digit1', shiftKey: true })

    expect(zoomIn.defaultPrevented).toBe(false)
    expect(fit.defaultPrevented).toBe(false)
    expect(flow.getViewport().zoom).toBe(1)
    expect(fitViewSpy).not.toHaveBeenCalled()
  })

  it('handles the shortcuts while the mouse is over the board, without focus', async () => {
    const { container } = mount()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })
    // jsdom has no pointer, so :hover never matches on its own
    const matches = container.matches.bind(container)
    vi.spyOn(container, 'matches').mockImplementation((selector) => selector === ':hover' || matches(selector))

    const event = await keydown({ key: '=', ctrlKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(flow.getViewport()).toEqual(zoomAround({ x: 0, y: 0, zoom: 1 }, ZOOM_STEP, center))
  })

  it('Ctrl + = zooms in around the center', async () => {
    mountWithFocus()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    const event = await keydown({ key: '=', ctrlKey: true })

    expect(flow.getViewport()).toEqual(zoomAround({ x: 0, y: 0, zoom: 1 }, ZOOM_STEP, center))
    expect(event.defaultPrevented).toBe(true)
  })

  it('Ctrl + + also zooms in', async () => {
    mountWithFocus()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    await keydown({ key: '+', ctrlKey: true })

    expect(flow.getViewport().zoom).toBeCloseTo(ZOOM_STEP)
  })

  it('Cmd + - zooms out around the center', async () => {
    mountWithFocus()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    await keydown({ key: '-', metaKey: true })

    expect(flow.getViewport()).toEqual(zoomAround({ x: 0, y: 0, zoom: 1 }, 1 / ZOOM_STEP, center))
  })

  it('Ctrl + 0 resets the zoom to 100%', async () => {
    mountWithFocus()
    await setStartViewport({ x: 30, y: 40, zoom: 2.5 })

    await keydown({ key: '0', ctrlKey: true })

    expect(flow.getViewport().zoom).toBe(1)
  })

  it('ignores the shortcuts without the modifier', async () => {
    mountWithFocus()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })

    const event = await keydown({ key: '=' })

    expect(event.defaultPrevented).toBe(false)
    expect(flow.getViewport().zoom).toBe(1)
  })

  it('ignores the shortcuts while typing in a text field', async () => {
    mountWithFocus()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })
    const input = document.createElement('input')
    screenContainer().appendChild(input)
    input.focus()

    const event = await keydown({ key: '=', ctrlKey: true }, input)

    expect(event.defaultPrevented).toBe(false)
    expect(flow.getViewport().zoom).toBe(1)
  })

  it('ignores the shortcuts while a modal dialog is open', async () => {
    mountWithFocus()
    await setStartViewport({ x: 0, y: 0, zoom: 1 })
    const dialog = document.createElement('div')
    dialog.setAttribute('aria-modal', 'true')
    document.body.appendChild(dialog)

    await keydown({ key: '=', ctrlKey: true })

    expect(flow.getViewport().zoom).toBe(1)
  })

  it('Shift + 1 asks React Flow to fit all cards, up to 100% zoom, and is kept from the browser', async () => {
    mountWithFocus()

    const event = await keydown({ key: '!', code: 'Digit1', shiftKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(fitViewSpy).toHaveBeenCalledExactlyOnceWith({ padding: 0.15, maxZoom: 1 })
  })

  it('does not fit the view when Shift + 1 comes with a modifier', async () => {
    mountWithFocus()

    const event = await keydown({ key: '!', code: 'Digit1', shiftKey: true, ctrlKey: true })

    expect(event.defaultPrevented).toBe(false)
    expect(fitViewSpy).not.toHaveBeenCalled()
  })

  it('stops listening after unmount', async () => {
    const { container, unmount } = mount()
    // Keeps the mouse "over" the board after unmount, so a leaked key listener would still act and fail the test
    const matches = container.matches.bind(container)
    vi.spyOn(container, 'matches').mockImplementation((selector) => selector === ':hover' || matches(selector))
    unmount()

    const wheelEvent = wheel(container, { ctrlKey: true, deltaY: -100 })
    const keyEvent = await keydown({ key: '=', ctrlKey: true })

    expect(wheelEvent.defaultPrevented).toBe(false)
    expect(keyEvent.defaultPrevented).toBe(false)
  })
})
