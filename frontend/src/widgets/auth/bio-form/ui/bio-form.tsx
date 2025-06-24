import React from "react"

import { QuestionsLayout } from "@/shared/ui/questions-layout"

interface BioFormProps {
  onNext: () => void
}

const BioForm: React.FC<BioFormProps> = ({ onNext }) => {
  return (
    <div>
      <QuestionsLayout
        header={<>Bio</>}
        children={<form></form>}
        footer={<button onClick={onNext}>Далее</button>}
      />
    </div>
  )
}

export default BioForm
