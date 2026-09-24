import './Workspace.css'

type WorkspaceProps = {
  droppedBlocks: string[]
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
}

function Workspace({ droppedBlocks, onDrop }: WorkspaceProps) {
  return (
    <section
      className="workspace"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {droppedBlocks.length === 0 ? (
        <div className="workspace__empty">Drop here</div>
      ) : (
        droppedBlocks.map((block, index) => (
          <div key={`${block}-${index}`} className="workspace__block">
            {block}
          </div>
        ))
      )}
    </section>
  )
}

export default Workspace
