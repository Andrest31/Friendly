import css from "./progress-bar.module.scss"

import React from "react"

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
}): React.ReactElement | null => {
  // Generate array of step numbers (excluding first step)
  const stepNumbers = Array.from(
    { length: totalSteps - 1 },
    (_, index) => index + 1
  )

  // Don't render if we're on the first step
  if (currentStep <= 0) {
    return null
  }

  return (
    <div className={css.progressBar}>
      {stepNumbers.map((stepNumber) => (
        <div
          key={stepNumber}
          className={
            stepNumber === currentStep
              ? css.progressBarItemActive
              : css.progressBarItem
          }>
          {stepNumber}
        </div>
      ))}
    </div>
  )
}

export default ProgressBar
