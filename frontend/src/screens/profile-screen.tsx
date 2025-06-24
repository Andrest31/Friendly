import { useTelegram } from "@/shared/hooks/use-telegram"

const ProfileScreen = () => {
  const { userData } = useTelegram()

  return (
    <div>
      <h1>
        {userData?.first_name} {userData?.last_name} ({userData?.username})
      </h1>
      <p>{userData?.id}</p>
      <img
        src={userData?.photo_url}
        alt=""
        style={{ width: "30%", borderRadius: "100%" }}
      />
    </div>
  )
}

export default ProfileScreen
