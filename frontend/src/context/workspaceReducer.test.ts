import { describe, expect, it } from 'vitest'
import type { AssetSnapshot, TodoItem } from '../api/assets'
import type { Viewer } from '../api/hub'
import {
  initialWorkspaceState,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceEvent,
  type WorkspaceState,
} from './workspaceReducer'

const item = (id: string, order: number, text = id): TodoItem => ({
  id,
  text,
  isDone: false,
  order,
  deadlineDate: null,
  completedDate: null,
})

const asset = (id: string, overrides: Partial<AssetSnapshot> = {}): AssetSnapshot => ({
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
  ...overrides,
})

const alice: Viewer = { userId: 'u1', displayName: 'Alice' }
const bob: Viewer = { userId: 'u2', displayName: 'Bob' }
const carol: Viewer = { userId: 'u3', displayName: 'Carol' }

const synced = (overrides: Partial<WorkspaceState> = {}): WorkspaceState => ({
  ...initialWorkspaceState,
  isSynced: true,
  hasLoaded: true,
  ...overrides,
})

const reduce = (state: WorkspaceState, ...actions: WorkspaceAction[]) => actions.reduce(workspaceReducer, state)

describe('events while synced', () => {
  it('ASSET_CREATED appends the asset', () => {
    const state = reduce(synced({ assets: [asset('a')] }), { type: 'ASSET_CREATED', asset: asset('b') })

    expect(state.assets.map((a) => a.id)).toEqual(['a', 'b'])
  })

  it('ASSET_UPDATED applies the delta to that asset only', () => {
    const state = reduce(synced({ assets: [asset('a'), asset('b')] }), {
      type: 'ASSET_UPDATED',
      assetId: 'b',
      delta: { title: 'Renamed', x: 5 },
    })

    expect(state.assets[0]).toEqual(asset('a'))
    expect(state.assets[1]).toEqual(asset('b', { title: 'Renamed', x: 5 }))
  })

  it('ASSET_UPDATED for an unknown asset changes nothing', () => {
    const before = synced({ assets: [asset('a')] })

    const after = reduce(before, { type: 'ASSET_UPDATED', assetId: 'missing', delta: { title: 'X' } })

    expect(after.assets).toEqual(before.assets)
  })

  it('ASSET_DELETED removes the asset', () => {
    const state = reduce(synced({ assets: [asset('a'), asset('b')] }), { type: 'ASSET_DELETED', assetId: 'a' })

    expect(state.assets.map((a) => a.id)).toEqual(['b'])
  })

  it('USER_JOINED adds the viewer and keeps viewers sorted by display name', () => {
    const state = reduce(
      synced({ viewers: [alice, carol] }),
      { type: 'USER_JOINED', viewer: bob },
    )

    expect(state.viewers.map((v) => v.displayName)).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('USER_LEFT removes the viewer', () => {
    const state = reduce(synced({ viewers: [alice, bob] }), { type: 'USER_LEFT', userId: 'u1' })

    expect(state.viewers).toEqual([bob])
  })

  it('does not buffer anything', () => {
    const state = reduce(synced(), { type: 'ASSET_CREATED', asset: asset('a') })

    expect(state.pending).toEqual([])
  })
})

describe('events are idempotent', () => {
  const events: { name: string; state: WorkspaceState; event: WorkspaceEvent }[] = [
    { name: 'ASSET_CREATED', state: synced({ assets: [asset('a')] }), event: { type: 'ASSET_CREATED', asset: asset('b') } },
    {
      name: 'ASSET_UPDATED',
      state: synced({ assets: [asset('a', { items: [item('i1', 0)] })] }),
      event: {
        type: 'ASSET_UPDATED',
        assetId: 'a',
        delta: { title: 'T', updated: [{ id: 'i1', text: 'new', isDone: true }], added: [item('i2', 1)] },
      },
    },
    { name: 'ASSET_DELETED', state: synced({ assets: [asset('a'), asset('b')] }), event: { type: 'ASSET_DELETED', assetId: 'a' } },
    { name: 'USER_JOINED', state: synced({ viewers: [alice] }), event: { type: 'USER_JOINED', viewer: bob } },
    { name: 'USER_LEFT', state: synced({ viewers: [alice, bob] }), event: { type: 'USER_LEFT', userId: 'u2' } },
  ]

  it.each(events)('$name applied twice equals applied once', ({ state, event }) => {
    const once = reduce(state, event)
    const twice = reduce(state, event, event)

    expect(twice).toEqual(once)
    // Guard against an event that does nothing at all
    expect(once).not.toEqual(state)
  })

  it('a repeated ASSET_CREATED keeps the first copy, not the second', () => {
    const state = reduce(
      synced(),
      { type: 'ASSET_CREATED', asset: asset('a', { title: 'First' }) },
      { type: 'ASSET_CREATED', asset: asset('a', { title: 'Second' }) },
    )

    expect(state.assets.map((a) => a.title)).toEqual(['First'])
  })
})

describe('joining', () => {
  it('SYNC_STARTED marks the state unsynced, clears the buffer and the error', () => {
    const state = reduce(
      synced({ pending: [{ type: 'USER_LEFT', userId: 'u1' }], error: 'old', assets: [asset('a')] }),
      { type: 'SYNC_STARTED' },
    )

    expect(state.isSynced).toBe(false)
    expect(state.pending).toEqual([])
    expect(state.error).toBeNull()
    // The cards stay on screen while it re-joins
    expect(state.assets).toEqual([asset('a')])
    expect(state.hasLoaded).toBe(true)
  })

  it('STATE_LOADED replaces the assets and viewers and marks it synced and loaded', () => {
    const state = reduce(
      { ...initialWorkspaceState, assets: [asset('stale')], viewers: [carol] },
      { type: 'SYNC_STARTED' },
      { type: 'STATE_LOADED', assets: [asset('a')], viewers: [alice] },
    )

    expect(state).toEqual({
      isSynced: true,
      hasLoaded: true,
      assets: [asset('a')],
      viewers: [alice],
      pending: [],
      error: null,
    })
  })

  it('buffers events that arrive during a join and does not apply them yet', () => {
    const event: WorkspaceEvent = { type: 'ASSET_CREATED', asset: asset('early') }

    const state = reduce(initialWorkspaceState, { type: 'SYNC_STARTED' }, event)

    expect(state.pending).toEqual([event])
    expect(state.assets).toEqual([])
  })

  it('applies buffered events, in order, after STATE_LOADED', () => {
    const state = reduce(
      initialWorkspaceState,
      { type: 'SYNC_STARTED' },
      { type: 'ASSET_CREATED', asset: asset('b') },
      { type: 'ASSET_UPDATED', assetId: 'b', delta: { title: 'B2' } },
      { type: 'USER_JOINED', viewer: bob },
      { type: 'ASSET_DELETED', assetId: 'a' },
      { type: 'STATE_LOADED', assets: [asset('a')], viewers: [alice] },
    )

    expect(state.assets).toEqual([asset('b', { title: 'B2' })])
    expect(state.viewers).toEqual([alice, bob])
    expect(state.pending).toEqual([])
  })

  it('a buffered event the loaded state already contains changes nothing', () => {
    const state = reduce(
      initialWorkspaceState,
      { type: 'SYNC_STARTED' },
      { type: 'ASSET_CREATED', asset: asset('a') },
      { type: 'USER_JOINED', viewer: alice },
      { type: 'STATE_LOADED', assets: [asset('a')], viewers: [alice] },
    )

    expect(state.assets).toEqual([asset('a')])
    expect(state.viewers).toEqual([alice])
  })

  it('SYNC_FAILED clears the buffer, stores the message and stays unsynced', () => {
    const state = reduce(
      initialWorkspaceState,
      { type: 'SYNC_STARTED' },
      { type: 'ASSET_CREATED', asset: asset('a') },
      { type: 'SYNC_FAILED', message: 'Could not join' },
    )

    expect(state.pending).toEqual([])
    expect(state.error).toBe('Could not join')
    expect(state.isSynced).toBe(false)
    expect(state.assets).toEqual([])
  })

  it('events buffered before a failed join are not applied by a later successful one', () => {
    const state = reduce(
      initialWorkspaceState,
      { type: 'SYNC_STARTED' },
      { type: 'ASSET_CREATED', asset: asset('ghost') },
      { type: 'SYNC_FAILED', message: 'Could not join' },
      { type: 'SYNC_STARTED' },
      { type: 'STATE_LOADED', assets: [], viewers: [] },
    )

    expect(state.assets).toEqual([])
    expect(state.error).toBeNull()
  })

  it('a re-join keeps hasLoaded true so the loading screen does not return', () => {
    const state = reduce(synced({ assets: [asset('a')] }), { type: 'SYNC_STARTED' })

    expect(state.isSynced).toBe(false)
    expect(state.hasLoaded).toBe(true)
  })
})

describe('LOCAL_EDIT', () => {
  it('applies the delta right away', () => {
    const state = reduce(synced({ assets: [asset('a')] }), { type: 'LOCAL_EDIT', assetId: 'a', delta: { title: 'Mine' } })

    expect(state.assets[0].title).toBe('Mine')
  })

  it('is never buffered, even while a join is in flight', () => {
    const state = reduce(
      { ...initialWorkspaceState, assets: [asset('a')] },
      { type: 'SYNC_STARTED' },
      { type: 'LOCAL_EDIT', assetId: 'a', delta: { title: 'Mine' } },
    )

    expect(state.pending).toEqual([])
    expect(state.assets[0].title).toBe('Mine')
  })

  it('for an unknown asset changes nothing', () => {
    const before = synced({ assets: [asset('a')] })

    expect(reduce(before, { type: 'LOCAL_EDIT', assetId: 'missing', delta: { title: 'X' } }).assets).toEqual(before.assets)
  })
})
