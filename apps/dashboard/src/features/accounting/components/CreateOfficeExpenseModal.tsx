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
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import type { Dayjs } from "dayjs";
import { useRef, useState } from "react";
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
  date: Dayjs | null;
  dateRange: [Dayjs, Dayjs] | null;
  currency: Currency;
  amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const buildPeriod = (values: FormValues): { periodStart: string; periodEnd: string } | null => {
  if (values.date) {
    const d = values.date.format("YYYY-MM-DD");
    return { periodStart: d, periodEnd: d };
  }
  if (values.dateRange?.[0] && values.dateRange[1]) {
    return {
      periodStart: values.dateRange[0].format("YYYY-MM-DD"),
      periodEnd: values.dateRange[1].format("YYYY-MM-DD"),
    };
  }
  return null;
};

const collectUploadedIds = (fileList: UploadFile[]): string[] =>
  fileList.filter((f) => f.status === "done").map((f) => f.uid);

export default function CreateOfficeExpenseModal({ open, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [isRange, setIsRange] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // beforeUpload fires synchronously for each file in a multi-file drop,
  // before AntD has a chance to update fileList — so we need a synchronous
  // counter to enforce the cap across the batch.
  const inFlightCount = useRef(0);

  const uploadingCount = fileList.filter((f) => f.status === "uploading").length;
  const doneCount = fileList.filter((f) => f.status === "done").length;

  const resetLocalState = () => {
    setIsRange(false);
    setFileList([]);
    inFlightCount.current = 0;
  };

  const cleanupUploadedFiles = (list: UploadFile[]) => {
    const ids = collectUploadedIds(list);
    if (ids.length === 0) return;
    void Promise.allSettled(ids.map((id) => fileApi.deleteFile(id)));
  };

  const { loading, run: submit } = useRequest(
    async (values: FormValues) => {
      const period = buildPeriod(values);
      if (!period) return;
      const fileIds = collectUploadedIds(fileList);
      const dto: CreateOfficeExpenseDto = {
        serviceName: values.serviceName,
        paymentPurpose: values.paymentPurpose,
        ...period,
        amount: values.amount,
        currency: values.currency,
        ...(fileIds.length > 0 && { fileIds }),
      };
      await officeExpenseApi.create(dto);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Office expense payment order created");
        resetLocalState();
        onSuccess();
        onClose();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const handleCancel = () => {
    cleanupUploadedFiles(fileList);
    resetLocalState();
    onClose();
  };

  const beforeUpload: UploadProps["beforeUpload"] = () => {
    if (doneCount + uploadingCount + inFlightCount.current >= MAX_CREATE_FILES) {
      message.warning(`You can attach at most ${MAX_CREATE_FILES} files.`);
      return Upload.LIST_IGNORE;
    }
    inFlightCount.current += 1;
    return true;
  };

  const customRequest: UploadProps["customRequest"] = async ({ file, onSuccess: ok, onError }) => {
    const entry = file as UploadFile;
    try {
      const fileId = await fileApi.uploadFile(file as File);
      ok?.(fileId);
      setFileList((cur) =>
        cur.map((x) => (x.uid === entry.uid ? { ...x, uid: fileId, status: "done" } : x)),
      );
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      setFileList((cur) => cur.filter((x) => x.uid !== entry.uid));
      message.error(getErrorMessage(err));
    }
  };

  const handleChange: UploadProps["onChange"] = ({ file, fileList: next }) => {
    setFileList(next);
    if (file.status === "done" || file.status === "error") {
      inFlightCount.current = Math.max(0, inFlightCount.current - 1);
    }
  };

  const handleRemove: UploadProps["onRemove"] = (file) => {
    if (file.status === "done") void fileApi.deleteFile(file.uid);
    return true;
  };

  const trySubmit = () => {
    if (uploadingCount > 0) {
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
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={uploadingCount > 0}
            onClick={trySubmit}
          >
            Create
          </Button>
        </Space>
      }
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
            fileList={fileList}
            beforeUpload={beforeUpload}
            customRequest={customRequest}
            onChange={handleChange}
            onRemove={handleRemove}
          >
            <Button
              icon={<UploadOutlined />}
              disabled={doneCount >= MAX_CREATE_FILES || uploadingCount > 0}
            >
              Upload files
            </Button>
          </Upload>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {uploadingCount > 0
              ? "Upload in progress… wait before creating."
              : `Up to ${MAX_CREATE_FILES} files. Files are linked when you create the order.`}
          </Typography.Paragraph>
        </Form.Item>
      </Form>
    </Modal>
  );
}
