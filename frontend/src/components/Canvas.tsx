import './Canvas.css'

type CanvasProps = {
  droppedBlocks: string[]
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
}

function Canvas({ droppedBlocks, onDrop }: CanvasProps) {
  return (
    <section
      className="canvas"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {droppedBlocks.length === 0 ? (
        <div className="canvas__empty">Drop here</div>
      ) : (
        droppedBlocks.map((block, index) => (
          <div key={`${block}-${index}`} className="canvas__block">
            {block}
          </div>
        ))
      )}
    </section>
  )
}

export default Canvas
