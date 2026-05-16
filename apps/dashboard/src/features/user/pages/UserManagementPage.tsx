import { Spinner, Tabs } from "@heroui/react";
import type React from "react";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import TeamsPage from "@/features/team/pages/TeamsPage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import UsersPage from "./UsersPage";

const UserManagementPage: React.FC = () => {
  const { permissions, loading } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewUsers = permissions.users?.view ?? false;
  const canViewTeams = permissions.teams?.view ?? false;
  const showTabs = canViewUsers && canViewTeams;
  const defaultTab = canViewUsers ? "users" : "teams";
  const activeTab = searchParams.get("tab") ?? defaultTab;

  const handleTabChange = useCallback(
    (key: string) => {
      setSearchParams({ tab: key });
    },
    [setSearchParams],
  );

  if (loading) {
    return <Spinner size="lg" />;
  }

  if (showTabs) {
    return (
      <div className="p-6">
        <Tabs selectedKey={activeTab} onSelectionChange={(key) => handleTabChange(String(key))}>
          <Tabs.List>
            <Tabs.Tab id="users">Users</Tabs.Tab>
            <Tabs.Tab id="teams">Teams</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="users">
            <UsersPage />
          </Tabs.Panel>
          <Tabs.Panel id="teams">
            <TeamsPage />
          </Tabs.Panel>
        </Tabs>
      </div>
    );
  }

  if (canViewTeams) {
    return <TeamsPage />;
  }

  if (!canViewUsers) {
    return null;
  }

  return <UsersPage />;
};

export default UserManagementPage;
