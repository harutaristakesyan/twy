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
import TeamsPage from "@/features/team/pages/TeamsPage";
import ProfilePage from "@/features/user/pages/ProfilePage";
import UsersPage from "@/features/user/pages/UsersPage";
import AppLayout from "@/layouts/AppLayout.tsx";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequirePermission from "@/routes/RequirePermission";

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
              <RequirePermission resource="users" action="view">
                <UsersPage />
              </RequirePermission>
            ),
          },
          {
            path: "branches",
            element: (
              <RequirePermission resource="branches" action="view">
                <BranchesPage />
              </RequirePermission>
            ),
          },
          {
            path: "loads",
            element: (
              <RequirePermission resource="loads" action="view">
                <LoadsPage />
              </RequirePermission>
            ),
          },
          {
            path: "loads/create",
            element: (
              <RequirePermission resource="loads" action="view">
                <CreateLoadPage />
              </RequirePermission>
            ),
          },
          {
            path: "outside-brokers",
            element: (
              <RequirePermission resource="brokers" action="view">
                <OutsideBrokersPage />
              </RequirePermission>
            ),
          },
          {
            path: "outside-carriers",
            element: (
              <RequirePermission resource="carriers" action="view">
                <OutsideCarriersPage />
              </RequirePermission>
            ),
          },
          {
            path: "teams",
            element: (
              <RequirePermission resource="teams" action="view">
                <TeamsPage />
              </RequirePermission>
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
