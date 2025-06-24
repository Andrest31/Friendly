import React, { useState } from "react"

interface EditableTextProps {
  withLeftIcon?: boolean
  withRightIcon?: boolean
  initText: string | number
  onChange?: (value: string) => void
}

const EditableText: React.FC<EditableTextProps> = ({ initText, onChange }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(initText.toString())

  const finishEditing = () => {
    setIsEditing(false)
    onChange?.(text)
  }

  const handleBlur = () => {
    finishEditing()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      finishEditing()
    }
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <span onClick={() => setIsEditing(true)} style={{ cursor: "pointer" }}>
      {text}
    </span>
  )
}

export default EditableText
