import { useDebounce, useRequest } from "ahooks";
import { App, Descriptions, Modal, Select, Spin, Typography } from "antd";
import { useMemo, useState } from "react";
import { loadApi } from "@/features/load/api/loadApi";
import type { Load } from "@/features/load/types/load";
import { renderCurrency } from "@/utils/formatters";
import { paymentOrderApi } from "../api/paymentOrderApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LoadOption {
  value: string;
  label: string;
  load: Load;
}

const computeFinancials = (load: Load) => {
  const customerRate = load.customerRate ?? null;
  const carrierRate = load.carrierRate ?? null;
  const serviceFee = load.serviceFee ?? 30;
  const profit =
    customerRate != null && carrierRate != null ? customerRate - carrierRate + serviceFee : null;
  return {
    brokerReceivable: customerRate,
    carrierPayable: carrierRate,
    profit,
    serviceFee,
  };
};

export default function CreateLoadPaymentOrderModal({ open, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState("");
  const debouncedQuery = useDebounce(searchText, { wait: 300 });
  const [selected, setSelected] = useState<Load | null>(null);

  const { data, loading } = useRequest(
    async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { loads: [], total: 0 };
      return loadApi.getAll({
        limit: 20,
        query: debouncedQuery,
        excludeWithExistingPO: true,
      });
    },
    { refreshDeps: [debouncedQuery] },
  );

  const options: LoadOption[] = useMemo(
    () =>
      (data?.loads ?? []).map((l) => ({
        value: l.id,
        label: `#${l.referenceNumber} — ${l.customer}${l.carrier ? ` → ${l.carrier}` : ""}`,
        load: l,
      })),
    [data],
  );

  const { run: submit, loading: submitting } = useRequest(
    async (loadId: string) => paymentOrderApi.create(loadId),
    {
      manual: true,
      onSuccess: () => {
        message.success("Load payment order created");
        onSuccess();
        handleClose();
      },
      onError: (err: Error & { response?: { data?: { message?: string }; status?: number } }) => {
        const status = err.response?.status;
        const apiMsg = err.response?.data?.message;
        if (status === 409) {
          message.error("A payment order already exists for this load");
        } else if (status === 422) {
          message.error(apiMsg ?? "Cannot create payment order — load is missing required fields");
        } else {
          message.error(apiMsg ?? "Failed to create payment order");
        }
      },
    },
  );

  const handleClose = () => {
    setSearchText("");
    setSelected(null);
    onClose();
  };

  const financials = selected ? computeFinancials(selected) : null;

  return (
    <Modal
      title="Create Load Payment Order"
      open={open}
      onCancel={handleClose}
      onOk={() => selected && submit(selected.id)}
      okText="Create Load PO"
      okButtonProps={{ disabled: !selected, loading: submitting }}
      destroyOnHidden
    >
      <Typography.Text strong>Load *</Typography.Text>
      <Select<string, LoadOption>
        showSearch={{ filterOption: false, onSearch: setSearchText }}
        placeholder="Search by load #, customer, carrier…"
        style={{ width: "100%", marginTop: 4 }}
        options={options}
        notFoundContent={loading ? <Spin size="small" /> : null}
        onChange={(_value, opt) => {
          if (!Array.isArray(opt)) setSelected(opt?.load ?? null);
        }}
        value={selected?.id}
        allowClear
        onClear={() => setSelected(null)}
      />

      {selected && financials && (
        <Descriptions
          column={1}
          size="small"
          style={{ marginTop: 16 }}
          title="Preview"
          items={[
            {
              key: "load",
              label: "Load",
              children: `#${selected.referenceNumber} — ${selected.customer}`,
            },
            { key: "branch", label: "Branch", children: selected.branchName },
            { key: "carrier", label: "Carrier", children: selected.carrier ?? "—" },
            {
              key: "br",
              label: "Broker Receivable",
              children: renderCurrency(financials.brokerReceivable),
            },
            {
              key: "cp",
              label: "Carrier Payable",
              children: renderCurrency(financials.carrierPayable),
            },
            { key: "status", label: "Status", children: "Pending" },
          ]}
        />
      )}
    </Modal>
  );
}
