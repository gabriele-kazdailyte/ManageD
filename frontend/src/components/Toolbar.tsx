import type { PresetInfo } from '../api/assets'
import TodoList from './TodoList'
import './Toolbar.css'

type ToolbarProps = {
  blockLabel?: string
  presets: PresetInfo[]
  selectedPreset: string | null
  onPresetChange: (presetName: string | null) => void
}

function Toolbar({ blockLabel = 'Todo List', presets, selectedPreset, onPresetChange }: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="Toolbar">
      <div className="toolbar__dropzone" aria-label="Toolbar drop zone">
        <TodoList label={blockLabel} />
        <select
          className="toolbar__preset"
          value={selectedPreset ?? ''}
          onChange={(event) => onPresetChange(event.target.value === '' ? null : event.target.value)}
          aria-label="Start new lists from preset"
        >
          <option value="">Empty list</option>
          {presets.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name} ({preset.itemCount})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default Toolbar
