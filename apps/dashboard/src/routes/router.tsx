import { createBrowserRouter, Navigate } from "react-router-dom";
import ChangePaymentStatusModal from "@/features/accounting/components/ChangePaymentStatusModal";
import CreateLoadPaymentOrderModal from "@/features/accounting/components/CreateLoadPaymentOrderModal";
import CreateOfficeExpenseModal from "@/features/accounting/components/CreateOfficeExpenseModal";
import OfficeExpensePaymentOrderDetailModal from "@/features/accounting/components/OfficeExpensePaymentOrderDetailModal";
import UpdatePaymentStatusModal from "@/features/accounting/components/UpdatePaymentStatusModal";
import ExternalBillingPage from "@/features/accounting/pages/ExternalBillingPage";
import InternalBillingPage from "@/features/accounting/pages/InternalBillingPage";
import PaymentOrdersPage from "@/features/accounting/pages/PaymentOrdersPage";
import CreatePasswordPage from "@/features/auth/pages/CreatePasswordPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegistrationPage from "@/features/auth/pages/RegistrationPage";
import SetPasswordPage from "@/features/auth/pages/SetPasswordPage";
import VerificationPage from "@/features/auth/pages/VerificationPage";
import BranchCreateModal from "@/features/branch/components/BranchCreateModal";
import BranchEditModal from "@/features/branch/components/BranchEditModal";
import BranchesPage from "@/features/branch/pages/BranchesPage";
import CarrierCreateModal from "@/features/carrier/components/CarrierCreateModal";
import CarrierEditModal from "@/features/carrier/components/CarrierEditModal";
import CarrierRequestModal from "@/features/carrier/components/CarrierRequestModal";
import CarrierRequestsTab from "@/features/carrier/pages/CarrierRequestsTab";
import OutsideCarriersTab from "@/features/carrier/pages/OutsideCarriersTab";
import TwyCarriersTab from "@/features/carrier/pages/TwyCarriersTab";
import CICreateModal from "@/features/community-license/components/CICreateModal";
import CIEditModal from "@/features/community-license/components/CIEditModal";
import LoadEditModal from "@/features/load/components/LoadEditModal";
import StatusUpdateModal from "@/features/load/components/StatusUpdateModal";
import CreateLoadPage from "@/features/load/pages/CreateLoadPage";
import LoadsPage from "@/features/load/pages/LoadsPage";
import BrokerRequestModal from "@/features/outside-broker/components/BrokerRequestModal";
import OutsideBrokerCreateModal from "@/features/outside-broker/components/OutsideBrokerCreateModal";
import OutsideBrokerEditModal from "@/features/outside-broker/components/OutsideBrokerEditModal";
import BrokerRequestsTab from "@/features/outside-broker/pages/BrokerRequestsTab";
import OutsideBrokersPage from "@/features/outside-broker/pages/OutsideBrokersPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import CreateTeamPage from "@/features/team/pages/CreateTeamPage";
import EditTeamPage from "@/features/team/pages/EditTeamPage";
import TeamsPage from "@/features/team/pages/TeamsPage";
import ChangePasswordModal from "@/features/user/components/ChangePasswordModal";
import UserCreateModal from "@/features/user/components/UserCreateModal";
import UserEditModal from "@/features/user/components/UserEditModal";
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
          { index: true, element: <Navigate to="/loads" replace /> },
          {
            path: "user-management",
            element: <Navigate to="/user-management/users" replace />,
          },
          {
            path: "user-management/users",
            element: (
              <RequirePermission resource="users" action="view">
                <UsersPage />
              </RequirePermission>
            ),
            children: [
              { path: "create", element: <UserCreateModal /> },
              { path: ":userId/edit", element: <UserEditModal /> },
            ],
          },
          {
            path: "user-management/teams",
            element: (
              <RequirePermission resource="teams" action="view">
                <TeamsPage />
              </RequirePermission>
            ),
          },
          {
            path: "user-management/teams/create",
            element: (
              <RequirePermission resource="teams" action="add">
                <CreateTeamPage />
              </RequirePermission>
            ),
          },
          {
            path: "user-management/teams/:teamId/edit",
            element: (
              <RequirePermission resource="teams" action="edit">
                <EditTeamPage />
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
            children: [
              { path: "create", element: <BranchCreateModal /> },
              { path: ":branchId/edit", element: <BranchEditModal /> },
            ],
          },
          {
            path: "loads",
            element: (
              <RequirePermission resource="loads" action="view">
                <LoadsPage />
              </RequirePermission>
            ),
            children: [
              { path: ":loadId/edit", element: <LoadEditModal /> },
              { path: ":loadId/status", element: <StatusUpdateModal /> },
            ],
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
            children: [
              { index: true, element: <Navigate to="directory" replace /> },
              {
                path: "directory",
                element: (
                  <RequirePermission resource="brokers" action="view">
                    <OutsideBrokersPage />
                  </RequirePermission>
                ),
                children: [
                  { path: "create", element: <OutsideBrokerCreateModal /> },
                  { path: ":brokerId/edit", element: <OutsideBrokerEditModal /> },
                ],
              },
              {
                path: "requests",
                element: (
                  <RequirePermission resource="brokers_requests" action="view">
                    <BrokerRequestsTab />
                  </RequirePermission>
                ),
                children: [{ path: ":requestId", element: <BrokerRequestModal /> }],
              },
            ],
          },
          {
            path: "carriers",
            children: [
              { index: true, element: <Navigate to="twy" replace /> },
              {
                path: "twy",
                element: (
                  <RequirePermission resource="carriers_twy" action="view">
                    <TwyCarriersTab />
                  </RequirePermission>
                ),
                children: [
                  { path: "create", element: <CarrierCreateModal kind="twy" /> },
                  { path: ":carrierId/edit", element: <CarrierEditModal /> },
                ],
              },
              {
                path: "outside",
                element: (
                  <RequirePermission resource="carriers_outside" action="view">
                    <OutsideCarriersTab />
                  </RequirePermission>
                ),
                children: [
                  { path: "create", element: <CarrierCreateModal kind="outside" /> },
                  { path: ":carrierId/edit", element: <CarrierEditModal /> },
                ],
              },
              {
                path: "requests",
                element: (
                  <RequirePermission resource="carriers_requests" action="view">
                    <CarrierRequestsTab />
                  </RequirePermission>
                ),
                children: [{ path: ":requestId", element: <CarrierRequestModal /> }],
              },
            ],
          },
          {
            path: "accounting",
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
                children: [
                  { path: "create-load-po", element: <CreateLoadPaymentOrderModal /> },
                  { path: "create-office-po", element: <CreateOfficeExpenseModal /> },
                  { path: ":paymentOrderId", element: <UpdatePaymentStatusModal /> },
                  { path: ":paymentOrderId/status", element: <ChangePaymentStatusModal /> },
                  {
                    path: "office-expense/:officeExpenseOrderId",
                    element: <OfficeExpensePaymentOrderDetailModal />,
                  },
                ],
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
          {
            path: "settings",
            element: (
              <RequirePermission resource="settings" action="view">
                <SettingsPage />
              </RequirePermission>
            ),
            children: [
              { path: "community-licenses/create", element: <CICreateModal /> },
              { path: "community-licenses/:ciId/edit", element: <CIEditModal /> },
            ],
          },
          {
            path: "profile",
            element: <ProfilePage />,
            children: [{ path: "change-password", element: <ChangePasswordModal /> }],
          },
        ],
      },
    ],
  },

  { path: "/home", element: <Navigate to="/loads" replace /> },
  { path: "*", element: <NotFound /> },
]);
