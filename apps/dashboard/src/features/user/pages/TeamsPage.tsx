import type React from "react";
import TeamManagementTable from "@/features/team/components/TeamManagementTable";
import { TeamModalProvider } from "@/features/team/providers/TeamModalProvider";

const TeamsPage: React.FC = () => (
  <TeamModalProvider>
    <TeamManagementTable />
  </TeamModalProvider>
);

export default TeamsPage;
