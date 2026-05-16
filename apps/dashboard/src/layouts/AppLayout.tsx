import { Outlet, useMatch } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

const AppLayout = () => {
  const isBleed = !!useMatch("/loads/*");
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className={`flex min-w-0 flex-1 flex-col overflow-auto ${isBleed ? "" : "p-3"}`.trim()}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
