// Mirrors the backend's response records (see docs/api-contract.md).
export type TemplateType = 'Todo' | 'Note'

export type TodoItem = {
  id: string
  text: string
  isDone: boolean
  order: number
  deadlineDate: string | null
  completedDate: string | null
}

export type AssetSnapshot = {
  id: string
  title: string
  templateType: TemplateType
  x: number
  y: number
  // Card size in pixels; 0 means auto (the card sizes itself). Otherwise 160 to 1200.
  sizeX: number
  sizeY: number
  // Stacking order, higher is on top
  zPos: number
  items: TodoItem[]
  noteContent: string
}

export type TodoItemChange = {
  id: string
  text?: string | null
  isDone?: boolean | null
  order?: number | null
  deadlineDate?: string | null
  clearDeadline?: boolean
  completedDate?: string | null
  clearCompletedDate?: boolean
}

export type AssetDelta = {
  title?: string | null
  x?: number | null
  y?: number | null
  sizeX?: number | null
  sizeY?: number | null
  zPos?: number | null
  noteContent?: string | null
  added?: TodoItem[]
  updated?: TodoItemChange[]
  deleted?: string[]
}

export type PresetInfo = {
  name: string
  itemCount: number
}

async function readJson<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`Could not ${action} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

export async function loadPresets(signal?: AbortSignal) {
  const response = await fetch('/api/assets/presets', { signal })

  return readJson<PresetInfo[]>(response, 'load presets')
}
