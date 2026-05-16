import type React from "react";
import { Outlet } from "react-router-dom";
import CarrierTable from "../components/CarrierTable";

const OutsideCarriersTab: React.FC = () => (
  <>
    <CarrierTable kind="outside" />
    <Outlet />
  </>
);

export default OutsideCarriersTab;
