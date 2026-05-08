import { Card, Tabs } from "antd";
import type React from "react";
import { AccountingModalProvider } from "../providers/AccountingModalProvider.tsx";
import ExternalBillingTab from "./ExternalBillingTab.tsx";
import InternalBillingTab from "./InternalBillingTab.tsx";
import TwyAccountingTab from "./TwyAccountingTab.tsx";

const TAB_ITEMS = [
  { key: "twy", label: "TWY Accounting", children: <TwyAccountingTab /> },
  { key: "external", label: "External Billing", children: <ExternalBillingTab /> },
  { key: "internal", label: "Internal Billing", children: <InternalBillingTab /> },
];

const AccountingPage: React.FC = () => (
  <AccountingModalProvider>
    <Card>
      <Tabs defaultActiveKey="twy" items={TAB_ITEMS} destroyInactiveTabPane />
    </Card>
  </AccountingModalProvider>
);

export default AccountingPage;
