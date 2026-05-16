// key="loads-redesign" — two-panel layout: list + map detail (see docs/plans/velvety-fluttering-deer.md).
import type React from "react";
import { Outlet } from "react-router-dom";
import { LoadsDetailPanel } from "@/features/load/components/LoadsDetailPanel";
import { LoadsListPanel } from "@/features/load/components/LoadsListPanel";

const LoadsPage: React.FC = () => (
  <div className="flex h-full w-full flex-col bg-background lg:flex-row">
    <LoadsListPanel />
    <LoadsDetailPanel />
    <Outlet />
  </div>
);

export default LoadsPage;
