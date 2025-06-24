import React from "react"

import { QuestionsLayout } from "@/shared/ui/questions-layout"

interface InterestSelectionProps {
  onNext: () => void
}

const InterestSelection: React.FC<InterestSelectionProps> = ({ onNext }) => {
  return (
    <div>
      <QuestionsLayout
        header={<>Interest Selection</>}
        children={<form></form>}
        footer={<button onClick={onNext}>Далее</button>}
      />
    </div>
  )
}

export default InterestSelection
