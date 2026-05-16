import { Spinner } from "@heroui/react";
import type React from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canViewBrokerRequests } from "@/utils/permissions";

/** Allows broker request queue when user has `brokers_requests.view` or full outside-broker access (view+edit). */
const RequireBrokerRequestsView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, permissions } = useCurrentUser();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canViewBrokerRequests(permissions)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireBrokerRequestsView;
