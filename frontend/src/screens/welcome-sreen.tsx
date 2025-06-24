import { useState } from "react"
import React from "react"

import { BasicInfoForm } from "@/widgets/auth/basic-info-form"
import { BioForm } from "@/widgets/auth/bio-form"
import { InterestSelection } from "@/widgets/auth/interest-selection"
import { Welcome } from "@/widgets/auth/welcome"
import { ProgressBar } from "@/widgets/progress-bar"

import { QuestionsLayout } from "@/shared/ui/questions-layout"

type StepComponent = (onNext: () => void) => React.ReactElement

const WELCOME_STEPS: StepComponent[] = [
  (onNext) => <Welcome onNext={onNext} />,
  (onNext) => <BasicInfoForm onNext={onNext} />,
  (onNext) => <BioForm onNext={onNext} />,
  (onNext) => <InterestSelection onNext={onNext} />,
]

const WelcomeScreen = () => {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, WELCOME_STEPS.length))
  }

  if (currentStep >= WELCOME_STEPS.length) {
    return (
      <QuestionsLayout>
        <div>
          <h2>Спасибо! 🎉</h2>
          <p>Вы завершили приветствие.</p>
        </div>
      </QuestionsLayout>
    )
  }

  return (
    <div>
      <ProgressBar
        currentStep={currentStep}
        totalSteps={WELCOME_STEPS.length}
      />
      <div>{WELCOME_STEPS[currentStep](handleNext)}</div>
    </div>
  )
}

export default WelcomeScreen
