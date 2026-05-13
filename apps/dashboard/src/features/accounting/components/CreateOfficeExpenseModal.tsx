import { UploadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import type dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { fileApi } from "@/libs/fileApi";
import { getErrorMessage } from "@/utils/errorUtils";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  type CreateOfficeExpenseDto,
  CURRENCY_OPTIONS,
  type Currency,
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  type OfficeExpenseService,
} from "../types/officeExpensePaymentOrder";

/** Keep in sync with `CreateOfficeExpenseEventSchema` `fileIds` max in packages/core. */
const MAX_CREATE_FILES = 20;

const { TextArea } = Input;

interface FormValues {
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  date: dayjs.Dayjs | null;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  currency: Currency;
  amount: number;
}

interface PendingUploadedFile {
  fileId: string;
  fileName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOfficeExpenseModal({ open, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [isRange, setIsRange] = useState(false);
  const [activeUploadCount, setActiveUploadCount] = useState(0);
  const [uploadList, setUploadList] = useState<UploadFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<PendingUploadedFile[]>([]);
  const uploadedFilesRef = useRef<PendingUploadedFile[]>([]);
  const inFlightUploadsRef = useRef(0);

  useEffect(() => {
    uploadedFilesRef.current = uploadedFiles;
  }, [uploadedFiles]);

  useEffect(() => {
    if (!open) {
      setUploadedFiles([]);
      setUploadList([]);
      setActiveUploadCount(0);
      setIsRange(false);
      inFlightUploadsRef.current = 0;
    }
  }, [open]);

  const { loading, run: submit } = useRequest(
    async (values: FormValues) => {
      let periodStart: string;
      let periodEnd: string;

      if (isRange) {
        const dr = values.dateRange;
        if (!dr?.[0] || !dr[1]) return;
        periodStart = dr[0].format("YYYY-MM-DD");
        periodEnd = dr[1].format("YYYY-MM-DD");
      } else {
        const d = values.date;
        if (!d) return;
        periodStart = d.format("YYYY-MM-DD");
        periodEnd = periodStart;
      }

      const dto: CreateOfficeExpenseDto = {
        serviceName: values.serviceName,
        paymentPurpose: values.paymentPurpose,
        periodStart,
        periodEnd,
        amount: values.amount,
        currency: values.currency,
      };
      if (uploadedFilesRef.current.length > 0) {
        dto.fileIds = uploadedFilesRef.current.map((f) => f.fileId);
      }

      await officeExpenseApi.create(dto);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Office expense payment order created");
        form.resetFields();
        setIsRange(false);
        setUploadedFiles([]);
        setUploadList([]);
        uploadedFilesRef.current = [];
        onSuccess();
        onClose();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const purgeUnlinkedUploads = (snap: PendingUploadedFile[]) => {
    void Promise.allSettled(snap.map((f) => fileApi.deleteFile(f.fileId))).catch(() => {
      /* best-effort cleanup */
    });
  };

  const handleCancel = () => {
    const snap = [...uploadedFilesRef.current];
    purgeUnlinkedUploads(snap);
    form.resetFields();
    setIsRange(false);
    setUploadedFiles([]);
    setUploadList([]);
    uploadedFilesRef.current = [];
    onClose();
  };

  const handleFileUpload = async (file: File): Promise<UploadFile | null> => {
    if (uploadedFilesRef.current.length >= MAX_CREATE_FILES) {
      message.warning(`You can attach at most ${MAX_CREATE_FILES} files.`);
      return null;
    }
    setActiveUploadCount((c) => c + 1);
    try {
      message.loading({ content: "Uploading file...", key: "upload" });
      const fileId = await fileApi.uploadFile(file);
      setUploadedFiles((prev) => {
        if (prev.length >= MAX_CREATE_FILES) {
          void fileApi.deleteFile(fileId);
          message.warning(`You can attach at most ${MAX_CREATE_FILES} files.`);
          return prev;
        }
        return [...prev, { fileId, fileName: file.name }];
      });
      message.success({ content: "File uploaded successfully", key: "upload" });
      return { uid: fileId, name: file.name, status: "done", size: file.size, type: file.type };
    } catch (error) {
      message.error({ content: getErrorMessage(error), key: "upload" });
      return null;
    } finally {
      setActiveUploadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleFileRemove = (file: UploadFile) => {
    void fileApi.deleteFile(file.uid);
    setUploadedFiles((prev) => prev.filter((item) => item.fileId !== file.uid));
    setUploadList((prev) => prev.filter((item) => item.uid !== file.uid));
    return true;
  };

  const trySubmit = () => {
    if (activeUploadCount > 0) {
      message.warning("Wait for files to finish uploading.");
      return;
    }
    void form.submit();
  };

  return (
    <Modal
      title="Create Office Expense Payment Order"
      open={open}
      onCancel={handleCancel}
      width={640}
      footer={
        <Space>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={activeUploadCount > 0}
            onClick={trySubmit}
          >
            Create
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ currency: "USD" }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="serviceName"
          label="Service Name"
          rules={[{ required: true, message: "Service name is required" }]}
        >
          <Select options={OFFICE_EXPENSE_SERVICE_OPTIONS} placeholder="Select service" />
        </Form.Item>

        <Form.Item
          name="paymentPurpose"
          label="Payment Purpose"
          rules={[{ required: true, message: "Payment purpose is required" }]}
        >
          <TextArea rows={3} placeholder="What is this expense for?" />
        </Form.Item>

        <Form.Item label="Date">
          <Space align="center" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>Single date</span>
            <Switch
              size="small"
              checked={isRange}
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
              <DatePicker.RangePicker style={{ width: "100%" }} />
            </Form.Item>
          ) : (
            <Form.Item
              name="date"
              noStyle
              rules={[{ required: true, message: "Date is required" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          )}
        </Form.Item>

        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select options={CURRENCY_OPTIONS} style={{ width: 100 }} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: "Amount is required" },
            { type: "number", min: 0.01, message: "Amount must be greater than 0" },
          ]}
        >
          <InputNumber style={{ width: "100%" }} min={0.01} precision={2} placeholder="0.00" />
        </Form.Item>

        <Form.Item label="Attachments">
          <Upload
            multiple
            fileList={uploadList}
            beforeUpload={(file) => {
              const current = uploadedFilesRef.current.length;
              const inFlight = inFlightUploadsRef.current;
              if (current + inFlight >= MAX_CREATE_FILES) {
                message.warning(`You can attach at most ${MAX_CREATE_FILES} files.`);
                return Upload.LIST_IGNORE;
              }
              inFlightUploadsRef.current += 1;
              void handleFileUpload(file)
                .then((uploaded) => {
                  if (uploaded) setUploadList((prev) => [...prev, uploaded]);
                })
                .finally(() => {
                  inFlightUploadsRef.current -= 1;
                });
              return false;
            }}
            onRemove={handleFileRemove}
          >
            <Button
              icon={<UploadOutlined />}
              disabled={uploadedFiles.length >= MAX_CREATE_FILES || activeUploadCount > 0}
            >
              Upload files
            </Button>
          </Upload>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {activeUploadCount > 0
              ? "Upload in progress… wait before creating."
              : `Up to ${MAX_CREATE_FILES} files. Files are linked when you create the order.`}
          </Typography.Paragraph>
        </Form.Item>
      </Form>
    </Modal>
  );
}
