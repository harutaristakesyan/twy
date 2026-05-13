import { Card, Tabs, Typography } from "antd";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import LoadPaymentOrdersTab from "../components/LoadPaymentOrdersTab";
import OfficeExpensePOTab from "../components/OfficeExpensePOTab";

export default function PaymentOrdersPage() {
  const canViewLoad = usePermission("load_payment_order", "view");
  const canViewOfficeExpense = usePermission("office_expense_payment_order", "view");
  const [searchParams, setSearchParams] = useSearchParams();

  const tabItems = [
    ...(canViewLoad
      ? [{ key: "load", label: "Load Payment Orders", children: <LoadPaymentOrdersTab /> }]
      : []),
    ...(canViewOfficeExpense
      ? [
          {
            key: "office-expense",
            label: "Office Expense Payment Orders",
            children: <OfficeExpensePOTab />,
          },
        ]
      : []),
  ];

  if (tabItems.length === 0) {
    return (
      <Card>
        <Typography.Text type="secondary">
          You don&apos;t have permission to view payment orders.
        </Typography.Text>
      </Card>
    );
  }

  const defaultActiveKey = canViewLoad ? "load" : "office-expense";
  const urlTab = searchParams.get("tab");
  const activeKey = urlTab && tabItems.some((t) => t.key === urlTab) ? urlTab : defaultActiveKey;

  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

  return (
    <Card>
      <Tabs items={tabItems} activeKey={activeKey} onChange={handleTabChange} />
    </Card>
  );
}
