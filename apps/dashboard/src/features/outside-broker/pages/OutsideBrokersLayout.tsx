import type React from "react";
import { Outlet } from "react-router-dom";
import { OutsideBrokerModalProvider } from "../providers/OutsideBrokerModalProvider";

const OutsideBrokersLayout: React.FC = () => (
  <OutsideBrokerModalProvider>
    <Outlet />
  </OutsideBrokerModalProvider>
);

export default OutsideBrokersLayout;
