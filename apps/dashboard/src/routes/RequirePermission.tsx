import { Spin } from "antd";
import type React from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Action, Resource } from "@/utils/permissions";

interface RequirePermissionProps {
  children: React.ReactNode;
  resource: Resource;
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

  if (!permissions[resource]?.[action]) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
