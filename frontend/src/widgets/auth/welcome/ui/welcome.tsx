import React from "react"

import { useTelegram } from "@/shared/hooks/use-telegram"
import { EditableText } from "@/shared/ui/editable-text"
import { QuestionsLayout } from "@/shared/ui/questions-layout"

interface WelcomeProps {
  onNext: () => void
}

const Welcome: React.FC<WelcomeProps> = ({ onNext }) => {
  const { userData } = useTelegram()

  return (
    <div>
      <QuestionsLayout
        header={
          <div>
            <h2>Добро пожаловать!</h2>
            <p>Рады видеть вас в нашем приложении 🎉</p>
          </div>
        }
        children={
          <div style={{ display: "flex", flexDirection: "column" }}>
            <img
              src={userData?.photo_url}
              alt=""
              style={{ width: "30%", borderRadius: "100%" }}
            />

            <EditableText
              initText={`${userData?.first_name} ${userData?.last_name}`}
              onChange={(value) => console.log(value)}
            />
          </div>
        }
        footer={<button onClick={onNext}>Далее</button>}
      />
    </div>
  )
}

export default Welcome
