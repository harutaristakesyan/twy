import type React from "react";
import { Outlet } from "react-router-dom";
import CarrierTable from "../components/CarrierTable";

const TwyCarriersTab: React.FC = () => (
  <>
    <CarrierTable kind="twy" />
    <Outlet />
  </>
);

export default TwyCarriersTab;
