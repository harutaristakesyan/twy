import { useRequest } from "ahooks";
import {
  App,
  Button,
  Checkbox,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
} from "antd";
import { loadApi } from "@/features/load/api/loadApi";
import type { Load, LoadStatus } from "@/features/load/types/load";
import { getErrorMessage } from "@/utils/errorUtils";

interface StatusUpdateModalProps {
  open: boolean;
  load: Load | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const statusColors: Record<LoadStatus, string> = {
  Pending: "gold",
  Approved: "green",
  ApprovedPaid: "cyan",
  Denied: "red",
  Hold: "orange",
};

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Hold", label: "Hold" },
  { value: "Denied", label: "Denied" },
];

const commentLabel = (status: LoadStatus | undefined, chargable: boolean): string | null => {
  if (status === "Hold") return "Hold Reason";
  if (status === "Denied") return "Decline Reason";
  if (status === "Approved" && chargable) return "Charge Reason";
  return null;
};

const StatusUpdateModal = ({ open, load, onCancel, onSuccess }: StatusUpdateModalProps) => {
  const { message: antMessage } = App.useApp();
  const [form] = Form.useForm();
  const selectedStatus = Form.useWatch("status", form) as LoadStatus | undefined;
  const isChargable = Form.useWatch("isChargable", form) as boolean | undefined;

  const { loading, run: submit } = useRequest(
    async (
      status: LoadStatus,
      chargable: boolean,
      chargeAmount: number | null,
      comment: string | undefined,
    ) => {
      await loadApi.changeStatus(load?.id ?? "", {
        status,
        isChargable: chargable,
        chargeAmount: chargable ? chargeAmount : null,
        comment,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        antMessage.success("Load status updated successfully");
        onSuccess();
      },
      onError: (error) => antMessage.error(getErrorMessage(error)),
    },
  );

  const handleSubmit = () => {
    if (!load) return;
    const { status, isChargable: chargable, chargeAmount, comment } = form.getFieldsValue();
    if (
      status === load.status &&
      (chargable ?? false) === (load.isChargable ?? false) &&
      (chargeAmount ?? null) === (load.chargeAmount ?? null)
    ) {
      onCancel();
      return;
    }
    if (chargable && (chargeAmount === null || chargeAmount <= 0)) {
      antMessage.error("Please enter a valid charge amount");
      return;
    }
    const label = commentLabel(status as LoadStatus, chargable ?? false);
    if (label && !comment?.trim()) {
      antMessage.error(`${label} is required`);
      return;
    }
    submit(status, chargable ?? false, chargeAmount ?? null, comment?.trim() || undefined);
  };

  if (!load) return null;

  const commentFieldLabel = commentLabel(selectedStatus, isChargable ?? false);

  return (
    <Modal
      title="Update Status Approval"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Update Status
          </Button>
        </Space>
      }
      width={500}
    >
      <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Reference Number">{load.referenceNumber}</Descriptions.Item>
        <Descriptions.Item label="Current Status">
          <Tag color={statusColors[load.status]}>{load.status}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: load.status,
          isChargable: load.isChargable ?? false,
          chargeAmount: load.chargeAmount ?? null,
        }}
      >
        <Form.Item name="status" label="New Status">
          <Select
            options={STATUS_OPTIONS}
            onChange={(v) => {
              if (v !== "Approved") {
                form.setFieldsValue({ isChargable: false, chargeAmount: null });
              }
              form.setFieldValue("comment", undefined);
            }}
          />
        </Form.Item>

        {selectedStatus === "Approved" && (
          <>
            <Form.Item name="isChargable" valuePropName="checked">
              <Checkbox
                onChange={(e) => {
                  if (!e.target.checked) form.setFieldValue("chargeAmount", null);
                  form.setFieldValue("comment", undefined);
                }}
              >
                Is Chargable
              </Checkbox>
            </Form.Item>

            {isChargable && (
              <Form.Item name="chargeAmount" label="Charge Amount">
                <InputNumber
                  min={0}
                  precision={2}
                  prefix="€"
                  style={{ width: "100%" }}
                  placeholder="Enter charge amount"
                />
              </Form.Item>
            )}
          </>
        )}

        {commentFieldLabel !== null && (
          <Form.Item name="comment" label={commentFieldLabel}>
            <Input.TextArea rows={3} placeholder={`Enter ${commentFieldLabel.toLowerCase()}…`} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default StatusUpdateModal;
