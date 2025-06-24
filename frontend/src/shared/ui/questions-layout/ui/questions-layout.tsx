import css from "./questions-layout.module.scss"

import React from "react"

interface QuestionsLayout {
  header?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

const QuestionsLayout: React.FC<QuestionsLayout> = ({
  header,
  children,
  footer,
}) => {
  return (
    <div className={css.layout}>
      {header && <div className={css.header}>{header}</div>}
      {children && <div className={css.children}>{children}</div>}
      {footer && <div className={css.footer}>{footer}</div>}
    </div>
  )
}

export default QuestionsLayout
