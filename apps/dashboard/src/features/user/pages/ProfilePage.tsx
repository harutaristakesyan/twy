import type React from "react";
import { Outlet } from "react-router-dom";
import UserSelfUpdate from "@/features/user/components/UserSelfUpdate";

const ProfilePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <UserSelfUpdate />
      <Outlet />
    </div>
  );
};

export default ProfilePage;
