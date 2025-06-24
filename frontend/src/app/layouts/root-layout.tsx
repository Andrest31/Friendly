import { useEffect } from "react"
import { Outlet } from "react-router-dom"

import { axiosInstance } from "@/shared/config/axios-instance"
import { useTelegram } from "@/shared/hooks/use-telegram"

const RootLayout = () => {
  const { initData } = useTelegram()

  useEffect(() => {
    axiosInstance
      .post("/auth/telegram", {
        initData,
      })
      .then((res) => console.log(res))
  }, [initData])

  return <Outlet />
}
export default RootLayout
