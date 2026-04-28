import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "@/app/layouts/Layout.tsx";
import ProtectedRoute from "@/auth/ProtectedRoute";
import RoleBasedRoute from "@/auth/RoleBasedRoute";
import BranchesPage from "@/pages/BranchesPage";
import CreateLoadPage from "@/pages/CreateLoadPage";
import CreatePasswordPage from "@/pages/CreatePasswordPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import LoadsPage from "@/pages/LoadsPage";
import LoginPage from "@/pages/LoginPage";
import OutsideBrokersPage from "@/pages/OutsideBrokersPage";
import OutsideCarriersPage from "@/pages/OutsideCarriersPage";
import ProfilePage from "@/pages/ProfilePage";
import RegistrationPage from "@/pages/RegistrationPage";
import UsersPage from "@/pages/UsersPage.tsx";
import VerificationPage from "@/pages/VerificationPage";
import { MenuFeature } from "@/shared/utils/permissions";

const NotFound = () => <div>Not Found</div>;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/verification", element: <VerificationPage /> },
  { path: "/create-password", element: <CreatePasswordPage /> },
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
