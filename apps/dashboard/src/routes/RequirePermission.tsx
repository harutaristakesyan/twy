import { Spin } from "antd";
import type React from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Action, Resource } from "@/utils/permissions";

interface RequirePermissionProps {
  children: React.ReactNode;
  /** Single resource or array of resources — access is granted if ANY resource passes. */
  resource: Resource | Resource[];
  action: Action;
}

const RequirePermission: React.FC<RequirePermissionProps> = ({ children, resource, action }) => {
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
        <Spin size="large" />
      </div>
    );
  }

  const resources = Array.isArray(resource) ? resource : [resource];
  const allowed = resources.some((r) => permissions[r]?.[action]);

  if (!allowed) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
