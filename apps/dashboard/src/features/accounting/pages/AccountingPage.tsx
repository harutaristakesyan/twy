import type React from "react";
import { Outlet } from "react-router-dom";
import { AccountingModalProvider } from "../providers/AccountingModalProvider.tsx";

const AccountingPage: React.FC = () => (
  <AccountingModalProvider>
    <Outlet />
  </AccountingModalProvider>
);

export default AccountingPage;
