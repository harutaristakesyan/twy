import { Tabs } from "@heroui/react";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import LoadPaymentOrdersTab from "../components/LoadPaymentOrdersTab";
import OfficeExpensePOTab from "../components/OfficeExpensePOTab";

type Tab = "load" | "office-expense";

export default function PaymentOrdersPage() {
  const canViewLoad = usePermission("load_payment_order", "view");
  const canViewOfficeExpense = usePermission("office_expense_payment_order", "view");
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultTab: Tab = canViewLoad ? "load" : "office-expense";
  const rawTab = searchParams.get("tab");
  const activeTab: Tab = rawTab === "load" || rawTab === "office-expense" ? rawTab : defaultTab;

  const handleTabChange = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    });
  };

  const tabs: { key: Tab; label: string }[] = [
    ...(canViewLoad ? [{ key: "load" as Tab, label: "Load Payment Orders" }] : []),
    ...(canViewOfficeExpense
      ? [{ key: "office-expense" as Tab, label: "Office Expense Payment Orders" }]
      : []),
  ];

  if (tabs.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-default-500">
          You don&apos;t have permission to view payment orders.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => handleTabChange(key as string)}
        aria-label="Payment orders"
      >
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.key} id={tab.key}>
              {tab.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {canViewLoad && (
          <Tabs.Panel id="load">
            <LoadPaymentOrdersTab />
          </Tabs.Panel>
        )}
        {canViewOfficeExpense && (
          <Tabs.Panel id="office-expense">
            <OfficeExpensePOTab />
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}
