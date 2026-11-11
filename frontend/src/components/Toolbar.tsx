import { useEffect, useRef, useState } from 'react'
import type { PresetInfo } from '../api/assets'
import TodoList from './TodoList'
import './Toolbar.css'

type ToolbarProps = {
  blockLabel?: string
  presets: PresetInfo[]
  selectedPreset: string | null
  onPresetChange: (presetName: string | null) => void
  onCreateNote: () => void
}

function Toolbar({
  blockLabel = 'Todo List',
  presets,
  selectedPreset,
  onPresetChange,
  onCreateNote,
}: ToolbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    const handleMouseDown = (event: MouseEvent) => {
      if (!blockRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [isMenuOpen])

  const choose = (presetName: string | null) => {
    onPresetChange(presetName)
    setIsMenuOpen(false)
  }

  return (
    <div className="toolbar" aria-label="Toolbar">
      <div className="toolbar__dropzone" aria-label="Toolbar drop zone">
        <div className="toolbar__block" ref={blockRef}>
          <TodoList
            label={blockLabel}
            hint={selectedPreset}
            onClick={() => setIsMenuOpen((open) => !open)}
          />
          {isMenuOpen ? (
            <ul className="toolbar__menu" role="listbox" aria-label="Start new lists from preset">
              <li>
                <button type="button" role="option" aria-selected={selectedPreset === null} onClick={() => choose(null)}>
                  Empty list
                </button>
              </li>
              {presets.map((preset) => (
                <li key={preset.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedPreset === preset.name}
                    onClick={() => choose(preset.name)}
                  >
                    {preset.name} ({preset.itemCount})
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <TodoList label="Sticky Note" type="application/sticky-note" onClick={onCreateNote} />
      </div>
    </div>
  )
}

export default Toolbar
