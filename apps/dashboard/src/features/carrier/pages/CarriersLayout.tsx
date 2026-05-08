import type React from "react";
import { Outlet } from "react-router-dom";
import { CarrierModalProvider } from "../providers/CarrierModalProvider";

const CarriersLayout: React.FC = () => (
  <CarrierModalProvider>
    <Outlet />
  </CarrierModalProvider>
);

export default CarriersLayout;
