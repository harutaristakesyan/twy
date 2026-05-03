import type React from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canViewBrokerRequests } from "@/utils/permissions";

/** Redirect `/outside-brokers` to the first tab the user can view. */
const OutsideBrokersIndexRedirect: React.FC = () => {
  const { permissions } = useCurrentUser();
  if (permissions.brokers?.view) {
    return <Navigate to="directory" replace />;
  }
  if (canViewBrokerRequests(permissions)) {
    return <Navigate to="requests" replace />;
  }
  return <Navigate to="directory" replace />;
};

export default OutsideBrokersIndexRedirect;
