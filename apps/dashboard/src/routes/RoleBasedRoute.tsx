import { Spin } from "antd";
import type React from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { MenuFeature } from "@/utils/permissions";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredFeature: MenuFeature;
}

/**
 * Role-based route protection component
 * Only allows access if user's role has permission for the required feature
 */
const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, requiredFeature }) => {
  const { user, loading, permissions } = useCurrentUser();

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
        <Spin size="large" />
      </div>
    );
  }

  if (!user || !permissions.menu[requiredFeature]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
