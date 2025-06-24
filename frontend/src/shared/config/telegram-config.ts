import WebApp from "@twa-dev/sdk"

export const initTelegramWebApp = () => {
  WebApp.ready()

  // Настройка темы
  WebApp.setHeaderColor(WebApp.themeParams.bg_color || "#2481cc")
  WebApp.setBackgroundColor(WebApp.themeParams.bg_color || "#ffffff")

  return WebApp
}

export const isTelegramWebApp = () => {
  return Boolean(WebApp.platform)
}
