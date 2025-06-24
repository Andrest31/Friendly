import { createBrowserRouter } from "react-router"

import { ProfileScreen, UserScreen, WelcomeScreen } from "@/screens"

import RootLayout from "./layouts/root-layout"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <div>Error</div>,
    children: [
      {
        path: "/",
        element: <WelcomeScreen />,
      },
      {
        path: "/profile",
        element: <ProfileScreen />,
      },
      {
        path: "/user/:userId",
        element: <UserScreen />,
      },
    ],
  },
])
