import { Outlet } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 p-3">
        <div className="flex h-full w-full flex-col overflow-auto rounded-2xl bg-white shadow-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
