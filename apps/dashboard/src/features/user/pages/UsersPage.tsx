import type React from "react";
import UserManagementTable from "@/features/user/components/UserManagementTable";
import { UserModalProvider } from "@/features/user/providers/UserModalProvider";

const UsersPage: React.FC = () => (
  <UserModalProvider>
    <UserManagementTable />
  </UserModalProvider>
);

export default UsersPage;
