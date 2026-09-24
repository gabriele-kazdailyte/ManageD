import TextFile from './TextFile'
import './Toolbar.css'

type ToolbarProps = {
  blockLabel?: string
}

function Toolbar({ blockLabel = 'Text File' }: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="Toolbar">
      <div className="toolbar__dropzone" aria-label="Toolbar drop zone">
        <TextFile label={blockLabel} />
      </div>
    </div>
  )
}

export default Toolbar
