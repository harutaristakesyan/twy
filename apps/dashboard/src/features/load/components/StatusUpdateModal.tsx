import { App, Button, Checkbox, InputNumber, Modal, Select, Space } from "antd";
import React, { useState } from "react";
import { loadApi } from "@/features/load/api/loadApi";
import type { Load, LoadStatus } from "@/features/load/types/load";
import { getErrorMessage } from "@/utils/errorUtils";

interface StatusUpdateModalProps {
  open: boolean;
  load: Load | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  open,
  load,
  onCancel,
  onSuccess,
}) => {
  const { message: antMessage } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LoadStatus | null>(null);
  const [isChargable, setIsChargable] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<number | null>(null);

  React.useEffect(() => {
    if (open && load) {
      setSelectedStatus(load.status);
      setIsChargable(load.isChargable ?? false);
      setChargeAmount(load.chargeAmount ?? null);
    } else {
      setSelectedStatus(null);
      setIsChargable(false);
      setChargeAmount(null);
    }
  }, [open, load]);

  const handleSubmit = async () => {
    if (!load || !selectedStatus) return;

    if (
      selectedStatus === load.status &&
      isChargable === load.isChargable &&
      chargeAmount === (load.chargeAmount ?? null)
    ) {
      onCancel();
      return;
    }

    if (isChargable && (chargeAmount === null || chargeAmount <= 0)) {
      antMessage.error("Please enter a valid charge amount");
      return;
    }

    setLoading(true);
    try {
      await loadApi.changeStatus(load.id, {
        status: selectedStatus,
        isChargable,
        chargeAmount: isChargable ? chargeAmount : null,
      });
      antMessage.success("Load status updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Failed to update load status:", error);
      antMessage.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(null);
    setIsChargable(false);
    setChargeAmount(null);
    onCancel();
  };

  const getStatusColor = (status: LoadStatus) => {
    const colors: Record<LoadStatus, string> = {
      Pending: "gold",
      Approved: "green",
      Denied: "red",
    };
    return colors[status];
  };

  if (!load) return null;

  return (
    <Modal
      title="Update Status Approval"
      open={open}
      onCancel={handleCancel}
      footer={
        <Space>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Update Status
          </Button>
        </Space>
      }
      width={500}
    >
      <div style={{ padding: "16px 0" }}>
        <div style={{ marginBottom: 24 }}>
          <strong>Reference Number:</strong> {load.referenceNumber}
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>Current Status:</strong>
          <span style={{ marginLeft: 8 }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "4px",
                backgroundColor: `var(--ant-${getStatusColor(load.status)}-1)`,
                color: `var(--ant-${getStatusColor(load.status)}-7)`,
                textTransform: "capitalize",
              }}
            >
              {load.status}
            </span>
          </span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>New Status:</strong>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: "100%" }}
            size="large"
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Approved", label: "Approved" },
              { value: "Denied", label: "Denied" },
            ]}
          />
        </div>
        <div style={{ marginBottom: isChargable ? 16 : 0 }}>
          <Checkbox
            checked={isChargable}
            onChange={(e) => {
              setIsChargable(e.target.checked);
              if (!e.target.checked) setChargeAmount(null);
            }}
          >
            <strong>Is Chargable</strong>
          </Checkbox>
        </div>
        {isChargable && (
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Charge Amount:</strong>
            <InputNumber
              value={chargeAmount}
              onChange={setChargeAmount}
              min={0}
              precision={2}
              prefix="$"
              style={{ width: "100%" }}
              size="large"
              placeholder="Enter charge amount"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatusUpdateModal;
