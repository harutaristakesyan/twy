import { createBrowserRouter, Navigate } from "react-router-dom";
import AccountingLayout from "@/features/accounting/pages/AccountingLayout";
import ExternalBillingPage from "@/features/accounting/pages/ExternalBillingPage";
import InternalBillingPage from "@/features/accounting/pages/InternalBillingPage";
import PaymentOrdersPage from "@/features/accounting/pages/PaymentOrdersPage";
import CreatePasswordPage from "@/features/auth/pages/CreatePasswordPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegistrationPage from "@/features/auth/pages/RegistrationPage";
import SetPasswordPage from "@/features/auth/pages/SetPasswordPage";
import VerificationPage from "@/features/auth/pages/VerificationPage";
import BranchesPage from "@/features/branch/pages/BranchesPage";
import CarrierRequestsTab from "@/features/carrier/pages/CarrierRequestsTab";
import CarriersIndexRedirect from "@/features/carrier/pages/CarriersIndexRedirect";
import CarriersLayout from "@/features/carrier/pages/CarriersLayout";
import OutsideCarriersTab from "@/features/carrier/pages/OutsideCarriersTab";
import TwyCarriersTab from "@/features/carrier/pages/TwyCarriersTab";
import CreateLoadPage from "@/features/load/pages/CreateLoadPage";
import LoadsPage from "@/features/load/pages/LoadsPage";
import BrokerRequestsTab from "@/features/outside-broker/pages/BrokerRequestsTab";
import OutsideBrokersIndexRedirect from "@/features/outside-broker/pages/OutsideBrokersIndexRedirect";
import OutsideBrokersLayout from "@/features/outside-broker/pages/OutsideBrokersLayout";
import OutsideBrokersPage from "@/features/outside-broker/pages/OutsideBrokersPage";
import ProfilePage from "@/features/user/pages/ProfilePage";
import TeamsPage from "@/features/user/pages/TeamsPage";
import UserManagementLayout from "@/features/user/pages/UserManagementLayout";
import UsersPage from "@/features/user/pages/UsersPage";
import AppLayout from "@/layouts/AppLayout.tsx";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireBrokerRequestsView from "@/routes/RequireBrokerRequestsView";
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
          { index: true, element: <Navigate to="/loads" replace /> },
          {
            path: "user-management",
            element: <UserManagementLayout />,
            children: [
              { index: true, element: <Navigate to="/user-management/users" replace /> },
              {
                path: "users",
                element: (
                  <RequirePermission resource="users" action="view">
                    <UsersPage />
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
            ],
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
            element: <OutsideBrokersLayout />,
            children: [
              { index: true, element: <OutsideBrokersIndexRedirect /> },
              {
                path: "directory",
                element: (
                  <RequirePermission resource="brokers" action="view">
                    <OutsideBrokersPage />
                  </RequirePermission>
                ),
              },
              {
                path: "requests",
                element: (
                  <RequireBrokerRequestsView>
                    <BrokerRequestsTab />
                  </RequireBrokerRequestsView>
                ),
              },
            ],
          },
          {
            path: "carriers",
            element: <CarriersLayout />,
            children: [
              { index: true, element: <CarriersIndexRedirect /> },
              {
                path: "twy",
                element: (
                  <RequirePermission resource="carriers_twy" action="view">
                    <TwyCarriersTab />
                  </RequirePermission>
                ),
              },
              {
                path: "outside",
                element: (
                  <RequirePermission resource="carriers_outside" action="view">
                    <OutsideCarriersTab />
                  </RequirePermission>
                ),
              },
              {
                path: "requests",
                element: (
                  <RequirePermission resource="carriers_requests" action="view">
                    <CarrierRequestsTab />
                  </RequirePermission>
                ),
              },
            ],
          },
          {
            path: "accounting",
            element: <AccountingLayout />,
            children: [
              { index: true, element: <Navigate to="/accounting/payment-orders" replace /> },
              {
                path: "payment-orders",
                element: (
                  <RequirePermission
                    resource={["load_payment_order", "office_expense_payment_order"]}
                    action="view"
                  >
                    <PaymentOrdersPage />
                  </RequirePermission>
                ),
              },
              {
                path: "external-billing",
                element: (
                  <RequirePermission resource="external_billing" action="view">
                    <ExternalBillingPage />
                  </RequirePermission>
                ),
              },
              {
                path: "internal-billing",
                element: (
                  <RequirePermission resource="internal_billing" action="view">
                    <InternalBillingPage />
                  </RequirePermission>
                ),
              },
            ],
          },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
    ],
  },

  { path: "/home", element: <Navigate to="/loads" replace /> },
  { path: "*", element: <NotFound /> },
]);
