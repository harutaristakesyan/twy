import type React from "react";
import UserManagementTable from "@/features/user/components/UserManagementTable";
import { UserModalProvider } from "../providers/UserModalProvider";

const UsersPage: React.FC = () => {
  return (
    <UserModalProvider>
      <UserManagementTable />
    </UserModalProvider>
  );
};

export default UsersPage;
