import React from "react"

import { QuestionsLayout } from "@/shared/ui/questions-layout"

interface BasicInfoFormProps {
  onNext: () => void
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ onNext }) => {
  return (
    <div>
      <QuestionsLayout
        header={<>Basic Info</>}
        children={<form></form>}
        footer={<button onClick={onNext}>Далее</button>}
      />
    </div>
  )
}

export default BasicInfoForm
