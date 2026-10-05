import TodoList from './TodoList'
import './Toolbar.css'

type ToolbarProps = {
  blockLabel?: string
}

function Toolbar({ blockLabel = 'Todo List' }: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="Toolbar">
      <div className="toolbar__dropzone" aria-label="Toolbar drop zone">
        <TodoList label={blockLabel} />
      </div>
    </div>
  )
}

export default Toolbar
