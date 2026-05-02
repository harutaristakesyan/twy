import { createBrowserRouter, Navigate } from "react-router-dom";
import CreatePasswordPage from "@/features/auth/pages/CreatePasswordPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegistrationPage from "@/features/auth/pages/RegistrationPage";
import SetPasswordPage from "@/features/auth/pages/SetPasswordPage";
import VerificationPage from "@/features/auth/pages/VerificationPage";
import BranchesPage from "@/features/branch/pages/BranchesPage";
import CreateLoadPage from "@/features/load/pages/CreateLoadPage";
import LoadsPage from "@/features/load/pages/LoadsPage";
import OutsideBrokersPage from "@/features/outside-broker/pages/OutsideBrokersPage";
import OutsideCarriersPage from "@/features/outside-carrier/pages/OutsideCarriersPage";
import ProfilePage from "@/features/user/pages/ProfilePage";
import UsersPage from "@/features/user/pages/UsersPage";
import AppLayout from "@/layouts/AppLayout.tsx";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RoleBasedRoute from "@/routes/RoleBasedRoute";
import { MenuFeature } from "@/utils/permissions";

const NotFound = () => <div>Not Found</div>;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/verification", element: <VerificationPage /> },
  { path: "/create-password", element: <CreatePasswordPage /> },
  { path: "/set-password", element: <SetPasswordPage /> },
  { path: "/register", element: <RegistrationPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: (
              <RoleBasedRoute requiredFeature={MenuFeature.USERS}>
                <UsersPage />
              </RoleBasedRoute>
            ),
          },
          {
            path: "branches",
            element: (
              <RoleBasedRoute requiredFeature={MenuFeature.BRANCHES}>
                <BranchesPage />
              </RoleBasedRoute>
            ),
          },
          {
            path: "loads",
            element: (
              <RoleBasedRoute requiredFeature={MenuFeature.LOADS}>
                <LoadsPage />
              </RoleBasedRoute>
            ),
          },
          {
            path: "loads/create",
            element: (
              <RoleBasedRoute requiredFeature={MenuFeature.LOADS}>
                <CreateLoadPage />
              </RoleBasedRoute>
            ),
          },
          {
            path: "outside-brokers",
            element: (
              <RoleBasedRoute requiredFeature={MenuFeature.OUTSIDE_BROKERS}>
                <OutsideBrokersPage />
              </RoleBasedRoute>
            ),
          },
          {
            path: "outside-carriers",
            element: (
              <RoleBasedRoute requiredFeature={MenuFeature.OUTSIDE_CARRIERS}>
                <OutsideCarriersPage />
              </RoleBasedRoute>
            ),
          },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
    ],
  },

  { path: "/home", element: <Navigate to="/" replace /> },
  { path: "*", element: <NotFound /> },
]);
