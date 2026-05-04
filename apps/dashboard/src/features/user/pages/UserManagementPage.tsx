import { Tabs } from "antd";
import type React from "react";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import TeamManagementTable from "@/features/team/components/TeamManagementTable";
import { TeamModalProvider } from "@/features/team/providers/TeamModalProvider";
import UserManagementTable from "@/features/user/components/UserManagementTable";
import { UserModalProvider } from "@/features/user/providers/UserModalProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const UserManagementPage: React.FC = () => {
  const { permissions } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewUsers = permissions.users?.view ?? false;
  const canViewTeams = permissions.teams?.view ?? false;
  const showTabs = canViewUsers && canViewTeams;
  const activeTab = searchParams.get("tab") ?? "users";

  const handleTabChange = useCallback(
    (key: string) => {
      setSearchParams({ tab: key });
    },
    [setSearchParams],
  );

  if (showTabs) {
    return (
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: "users",
            label: "Users",
            children: (
              <UserModalProvider>
                <UserManagementTable />
              </UserModalProvider>
            ),
          },
          {
            key: "teams",
            label: "Teams",
            children: (
              <TeamModalProvider>
                <TeamManagementTable />
              </TeamModalProvider>
            ),
          },
        ]}
      />
    );
  }

  if (canViewTeams) {
    return (
      <TeamModalProvider>
        <TeamManagementTable />
      </TeamModalProvider>
    );
  }

  return (
    <UserModalProvider>
      <UserManagementTable />
    </UserModalProvider>
  );
};

export default UserManagementPage;
