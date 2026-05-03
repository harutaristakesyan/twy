import type React from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/** Redirect `/carriers` to the first carrier tab the user can view. */
const CarriersIndexRedirect: React.FC = () => {
  const { permissions } = useCurrentUser();
  if (permissions.carriers_twy?.view) {
    return <Navigate to="twy" replace />;
  }
  if (permissions.carriers_outside?.view) {
    return <Navigate to="outside" replace />;
  }
  if (permissions.carriers_requests?.view) {
    return <Navigate to="requests" replace />;
  }
  return <Navigate to="twy" replace />;
};

export default CarriersIndexRedirect;
