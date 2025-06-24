import "@/shared/styles/_global.scss"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { RouterProvider } from "react-router-dom"
import { scan } from "react-scan"
import { PersistGate } from "redux-persist/integration/react"

import {
  initTelegramWebApp,
  isTelegramWebApp,
} from "@/shared/config/telegram-config"
import store, { persistor } from "@/shared/store/redux-store"

import { router } from "./router"

if (isTelegramWebApp()) {
  initTelegramWebApp()
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RouterProvider router={router} />
      </PersistGate>
    </Provider>
  </StrictMode>
)

if (import.meta.env.DEV) {
  scan({
    enabled: true,
  })
}
