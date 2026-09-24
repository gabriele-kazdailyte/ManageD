import './TextFile.css'

type TextFileProps = {
  label: string
  type?: string
}

function TextFile({ label, type = 'application/text-file' }: TextFileProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(type, label)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      className="draggable-block"
      draggable
      onDragStart={handleDragStart}
      aria-label={`Draggable ${label} block`}
    >
      {label}
    </div>
  )
}

export default TextFile
