import type React from "react";
import TeamManagementTable from "../components/TeamManagementTable";
import { TeamModalProvider } from "../providers/TeamModalProvider";

const TeamsPage: React.FC = () => (
  <TeamModalProvider>
    <TeamManagementTable />
  </TeamModalProvider>
);

export default TeamsPage;
