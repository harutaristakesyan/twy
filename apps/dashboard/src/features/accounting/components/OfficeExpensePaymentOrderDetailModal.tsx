import { UploadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
  App,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Upload,
} from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  CURRENCY_OPTIONS,
  type Currency,
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  OFFICE_EXPENSE_STATUS_OPTIONS,
  type OfficeExpensePaymentStatus,
  type OfficeExpenseService,
  SERVICE_LABELS,
  type UpdateOfficeExpenseDto,
} from "../types/officeExpensePaymentOrder";

const { TextArea } = Input;

interface FormValues {
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  date: Dayjs | null;
  dateRange: [Dayjs, Dayjs] | null;
  currency: Currency;
  amount: number;
  paymentStatus: OfficeExpensePaymentStatus;
}

interface Props {
  orderId: string | null;
  open: boolean;
  mode: "view" | "edit";
  onClose: () => void;
  onSuccess: () => void;
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€" };

function titleSuffix(order: { serviceName: OfficeExpenseService; paymentPurpose: string }) {
  const label = SERVICE_LABELS[order.serviceName];
  const p = order.paymentPurpose.replace(/\s+/g, " ").trim();
  const short = p.length > 50 ? `${p.slice(0, 50)}…` : p;
  return `${label} — ${short}`;
}

export default function OfficeExpensePaymentOrderDetailModal({
  orderId,
  open,
  mode,
  onClose,
  onSuccess,
}: Props) {
  const readOnly = mode === "view";
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [isRange, setIsRange] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const {
    data: order,
    loading,
    run: loadOrder,
    refresh: refreshOrder,
  } = useRequest(
    async () => {
      if (!orderId) {
        throw new Error("Missing office expense payment order");
      }
      return officeExpenseApi.get(orderId);
    },
    {
      manual: true,
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const displayOrder = order && orderId && order.id === orderId ? order : null;

  const watchedCurrency = Form.useWatch("currency", form);
  const amountCurrency = (watchedCurrency ?? displayOrder?.currency ?? "USD") as Currency;
  const amountPrefix = CURRENCY_SYMBOL[amountCurrency];

  useEffect(() => {
    if (open && orderId) {
      void loadOrder();
    }
  }, [open, orderId, loadOrder]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setIsRange(false);
      setFileList([]);
    }
  }, [open, form]);

  useEffect(() => {
    if (!displayOrder) {
      setFileList([]);
      return;
    }
    setFileList(
      displayOrder.files.map((f) => ({
        uid: f.fileId,
        name: f.fileName,
        status: "done" as const,
      })),
    );
  }, [displayOrder]);

  useEffect(() => {
    if (!displayOrder || !open) return;
    const sameDay = displayOrder.periodStart === displayOrder.periodEnd;
    setIsRange(!sameDay);
    form.setFieldsValue({
      serviceName: displayOrder.serviceName,
      paymentPurpose: displayOrder.paymentPurpose,
      date: sameDay ? dayjs(displayOrder.periodStart) : null,
      dateRange: !sameDay ? [dayjs(displayOrder.periodStart), dayjs(displayOrder.periodEnd)] : null,
      currency: displayOrder.currency,
      amount: displayOrder.amount,
      paymentStatus: displayOrder.paymentStatus,
    });
  }, [displayOrder, open, form]);

  const { loading: saving, run: save } = useRequest(
    async (values: FormValues) => {
      if (!orderId || !order || order.id !== orderId) return;
      let periodStart: string;
      let periodEnd: string;
      if (isRange) {
        const range = values.dateRange;
        if (!range?.[0] || !range[1]) return;
        periodStart = range[0].format("YYYY-MM-DD");
        periodEnd = range[1].format("YYYY-MM-DD");
      } else {
        const d = values.date;
        if (!d) return;
        periodStart = d.format("YYYY-MM-DD");
        periodEnd = periodStart;
      }
      const dto: UpdateOfficeExpenseDto = {
        serviceName: values.serviceName,
        paymentPurpose: values.paymentPurpose,
        periodStart,
        periodEnd,
        amount: values.amount,
        currency: values.currency,
        paymentStatus: values.paymentStatus,
      };
      await officeExpenseApi.update(orderId, dto);
    },
    {
      manual: true,
      onSuccess: async () => {
        message.success("Office expense payment order updated");
        onSuccess();
        await refreshOrder();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const handleFileChange: UploadProps["onChange"] = ({ file, fileList: next }) => {
    setFileList(next);
    if (file.status === "done") {
      message.success(`${file.name} uploaded`);
    } else if (file.status === "error") {
      message.error(`${file.name} failed to upload`);
    }
  };

  const customRequest: UploadProps["customRequest"] | undefined = readOnly
    ? undefined
    : async ({ file, onSuccess: onUp, onError }) => {
        if (!orderId) return;
        try {
          const realId = await officeExpenseApi.addFile(orderId, file as File);
          onUp?.(realId);
          const nextOrder = await officeExpenseApi.get(orderId);
          setFileList(
            nextOrder.files.map((f) => ({
              uid: f.fileId,
              name: f.fileName,
              status: "done" as const,
            })),
          );
          await refreshOrder();
          onSuccess();
        } catch (err) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      };

  const handleRemove: UploadProps["onRemove"] | undefined = readOnly
    ? undefined
    : async (file) => {
        if (!orderId) return false;
        try {
          await officeExpenseApi.removeFile(orderId, file.uid);
          message.success(`${file.name} removed`);
          await refreshOrder();
          onSuccess();
          return true;
        } catch (err) {
          message.error(getErrorMessage(err));
          return false;
        }
      };

  const handleDownload: UploadProps["onDownload"] = (file) => {
    void officeExpenseApi.downloadFile(file.uid, file.name).catch((err) => {
      message.error(getErrorMessage(err));
    });
  };

  const hasUploadInProgress = fileList.some((f) => f.status === "uploading");

  const modalTitle = displayOrder
    ? `${readOnly ? "View" : "Edit"} Office Expense Payment Order — ${titleSuffix(displayOrder)}`
    : `${readOnly ? "View" : "Edit"} Office Expense Payment Order`;

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnHidden
      footer={
        readOnly ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={hasUploadInProgress}
              onClick={() => form.submit()}
            >
              Save
            </Button>
          </Space>
        )
      }
    >
      <Spin spinning={loading}>
        {displayOrder && (
          <Form
            form={form}
            layout="vertical"
            disabled={readOnly}
            onFinish={(values: FormValues) => {
              if (readOnly) return;
              void save(values);
            }}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="serviceName"
              label="Service name"
              rules={[{ required: true, message: "Service name is required" }]}
            >
              <Select
                options={OFFICE_EXPENSE_SERVICE_OPTIONS}
                placeholder="Select service"
                disabled={readOnly}
              />
            </Form.Item>

            <Form.Item
              name="paymentPurpose"
              label="Payment purpose"
              rules={[{ required: true, message: "Payment purpose is required" }]}
            >
              <TextArea rows={3} disabled={readOnly} />
            </Form.Item>

            <Form.Item label="Date">
              <Space align="center" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>Single date</span>
                <Switch
                  size="small"
                  checked={isRange}
                  disabled={readOnly}
                  onChange={(checked) => {
                    setIsRange(checked);
                    form.setFieldsValue({ date: null, dateRange: null });
                  }}
                />
                <span style={{ fontSize: 13 }}>Date range</span>
              </Space>
              {isRange ? (
                <Form.Item
                  name="dateRange"
                  noStyle
                  rules={[{ required: true, message: "Date range is required" }]}
                >
                  <DatePicker.RangePicker style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              ) : (
                <Form.Item
                  name="date"
                  noStyle
                  rules={[{ required: true, message: "Date is required" }]}
                >
                  <DatePicker style={{ width: "100%" }} disabled={readOnly} />
                </Form.Item>
              )}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                  <Select
                    options={CURRENCY_OPTIONS}
                    style={{ width: "100%" }}
                    disabled={readOnly}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="amount"
                  label="Amount"
                  rules={[
                    { required: true, message: "Amount is required" },
                    { type: "number", min: 0.01, message: "Amount must be greater than 0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0.01}
                    precision={2}
                    prefix={amountPrefix}
                    disabled={readOnly}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="paymentStatus"
              label="Payment status"
              rules={[{ required: true, message: "Status is required" }]}
            >
              <Select options={OFFICE_EXPENSE_STATUS_OPTIONS} disabled={readOnly} />
            </Form.Item>

            <Form.Item label="Documents">
              <Upload
                multiple
                disabled={readOnly}
                fileList={fileList}
                customRequest={customRequest}
                onChange={handleFileChange}
                onRemove={handleRemove}
                onDownload={handleDownload}
                showUploadList={{ showDownloadIcon: true, showRemoveIcon: !readOnly }}
              >
                {!readOnly && <Button icon={<UploadOutlined />}>Upload file</Button>}
              </Upload>
            </Form.Item>
          </Form>
        )}
      </Spin>
    </Modal>
  );
}
