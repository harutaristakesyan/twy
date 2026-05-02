import { Typography } from "antd";
import type React from "react";
import UserSelfUpdate from "@/features/user/components/UserSelfUpdate";

const { Title } = Typography;

const ProfilePage: React.FC = () => {
  return (
    <div>
      <Title level={2}>My Profile</Title>
      <UserSelfUpdate />
    </div>
  );
};

export default ProfilePage;
