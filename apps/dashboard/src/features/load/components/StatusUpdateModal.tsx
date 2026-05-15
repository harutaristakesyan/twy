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
  Radio,
  Select,
  Space,
  Tag,
} from "antd";
import { useRef } from "react";
import { FileUploader, type FileUploaderHandle } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import type { Load, LoadStatus } from "@/features/load/types/load";
import { getAllowedTransitions } from "@/features/load/utils/statusMachine";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";

interface StatusUpdateModalProps {
  open: boolean;
  load: Load | null;
  onCancel: () => void;
  onSuccess: () => void;
}

interface StatusFormValues {
  status: LoadStatus;
  isChargable: boolean;
  chargeAmount: number | null;
  chargeSide: "broker" | "carrier" | null;
  comment: string | undefined;
}

const statusColors: Record<LoadStatus, string> = {
  Pending: "gold",
  Approved: "green",
  Delivered: "cyan",
  Declined: "red",
  Hold: "orange",
};

const commentLabel = (status: LoadStatus | undefined, chargable: boolean): string | null => {
  if (status === "Hold") return "Hold Reason";
  if (status === "Declined") return "Decline Reason";
  if (status === "Delivered" && chargable) return "Charge Reason";
  return null;
};

const StatusUpdateModal = ({ open, load, onCancel, onSuccess }: StatusUpdateModalProps) => {
  const { message: antMessage } = App.useApp();
  const [form] = Form.useForm<StatusFormValues>();
  const selectedStatus = Form.useWatch("status", form);
  const isChargable = Form.useWatch("isChargable", form);
  const { permissions } = useCurrentUser();
  const uploaderRef = useRef<FileUploaderHandle>(null);

  const { loading, run: submit } = useRequest(
    async (
      status: LoadStatus,
      chargable: boolean,
      chargeAmount: number | null,
      chargeSide: "broker" | "carrier" | null,
      fileIds: string[],
      comment: string | undefined,
    ) => {
      await loadApi.changeStatus(load?.id ?? "", {
        status,
        isChargable: chargable,
        chargeAmount: chargable ? chargeAmount : null,
        chargeSide: chargable ? chargeSide : null,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
        comment,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        uploaderRef.current?.commit();
        antMessage.success("Load status updated successfully");
        onSuccess();
      },
      onError: (error) => antMessage.error(getErrorMessage(error)),
    },
  );

  const handleSubmit = async () => {
    if (!load) return;
    let values: StatusFormValues;
    try {
      values = await form.validateFields();
    } catch (e) {
      if ((e as { errorFields?: unknown }).errorFields) return;
      throw e;
    }
    const { status, isChargable: chargable, chargeAmount, chargeSide, comment } = values;
    const fileIds = uploaderRef.current?.fileIds ?? [];
    if (
      status === load.status &&
      (chargable ?? false) === (load.isChargable ?? false) &&
      (chargeAmount ?? null) === (load.chargeAmount ?? null) &&
      (chargeSide ?? null) === (load.chargeSide ?? null) &&
      fileIds.length === 0
    ) {
      onCancel();
      return;
    }
    submit(
      status,
      chargable ?? false,
      chargeAmount ?? null,
      chargeSide ?? null,
      fileIds,
      comment?.trim() || undefined,
    );
  };

  if (!load) return null;

  const allowedStatuses = getAllowedTransitions(load.status).filter((s) =>
    Boolean((permissions as Record<string, Record<string, boolean>>).loads?.[`transition:${s}`]),
  );
  const statusOptions = allowedStatuses.map((s) => ({ value: s, label: s }));
  const isTerminal = allowedStatuses.length === 0;
  const commentFieldLabel = commentLabel(selectedStatus, isChargable ?? false);

  return (
    <Modal
      title="Update Load Status"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          {!isTerminal && (
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Update Status
            </Button>
          )}
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

      {isTerminal ? (
        <p style={{ color: "var(--ant-color-text-secondary)" }}>
          This load is in a terminal state and cannot be transitioned further.
        </p>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: load.status,
            isChargable: load.isChargable ?? false,
            chargeAmount: load.chargeAmount ?? null,
            chargeSide: load.chargeSide ?? null,
          }}
        >
          <Form.Item name="status" label="New Status">
            <Select
              options={statusOptions}
              onChange={(v) => {
                if (v !== "Delivered") {
                  form.setFieldsValue({ isChargable: false, chargeAmount: null, chargeSide: null });
                }
                form.resetFields(["comment"]);
              }}
            />
          </Form.Item>

          {selectedStatus === "Delivered" && (
            <>
              <Form.Item name="isChargable" valuePropName="checked">
                <Checkbox
                  onChange={(e) => {
                    if (!e.target.checked) {
                      form.setFieldsValue({ chargeAmount: null, chargeSide: null });
                    }
                    form.resetFields(["comment"]);
                  }}
                >
                  Is Chargable
                </Checkbox>
              </Form.Item>

              {isChargable && (
                <>
                  <Form.Item
                    name="chargeSide"
                    label="Charge Side"
                    rules={[
                      { required: true, message: "Please select Broker Side or Carrier Side" },
                    ]}
                  >
                    <Radio.Group>
                      <Radio value="broker">Broker Side</Radio>
                      <Radio value="carrier">Carrier Side</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    name="chargeAmount"
                    label="Charge Amount"
                    rules={[
                      {
                        validator: (_, v) =>
                          typeof v === "number" && v > 0
                            ? Promise.resolve()
                            : Promise.reject(new Error("Charge Amount must be greater than 0")),
                      },
                    ]}
                  >
                    <InputNumber
                      min={0.01}
                      precision={2}
                      prefix="€"
                      style={{ width: "100%" }}
                      placeholder="Enter charge amount"
                    />
                  </Form.Item>

                  <Form.Item label="Documents">
                    <FileUploader ref={uploaderRef} max={5} disabled={loading} />
                  </Form.Item>
                </>
              )}
            </>
          )}

          {commentFieldLabel !== null && (
            <Form.Item
              name="comment"
              label={commentFieldLabel}
              preserve={false}
              rules={[
                { required: true, message: `${commentFieldLabel} is required` },
                { max: 500, message: "Comment cannot exceed 500 characters" },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder={`Enter ${commentFieldLabel.toLowerCase()}…`}
                showCount
                maxLength={500}
              />
            </Form.Item>
          )}
        </Form>
      )}
    </Modal>
  );
};

export default StatusUpdateModal;
