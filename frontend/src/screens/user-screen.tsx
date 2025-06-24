import { useParams } from "react-router-dom"

const UserScreen = () => {
  const { userId } = useParams()

  console.log("userId: ", userId)

  return <div>user-screen</div>
}

export default UserScreen
