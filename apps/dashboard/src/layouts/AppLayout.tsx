import { Outlet } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-auto p-3">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
