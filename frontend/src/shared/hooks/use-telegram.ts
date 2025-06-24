import WebApp from "@twa-dev/sdk"

export const useTelegram = () => {
  const tg = WebApp
  const initData = WebApp.initData
  const userData = WebApp.initDataUnsafe.user

  return { tg, initData, userData }
}
