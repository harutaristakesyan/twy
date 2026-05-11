import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import type { UploadFile } from "antd";
import {
  App,
  Button,
  Col,
  Divider,
  Form,
  Grid,
  Input,
  Modal,
  Row,
  Space,
  Steps,
  Switch,
  Typography,
  Upload,
} from "antd";
import type { NamePath } from "antd/es/form/interface";
import { useEffect, useRef, useState } from "react";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { Load, LoadFile, Location, UpdateLoadDto } from "@/features/load/types/load";
import { fileApi } from "@/libs/fileApi";
import { getErrorMessage } from "@/utils/errorUtils";

interface LoadEditModalProps {
  open: boolean;
  load: Load;
  onCancel: () => void;
  onSuccess: () => void;
}

const FORM_COL = { xs: 24 as const, md: 12 as const };

const STEP_ITEMS_META = [
  { title: "Customer & carrier", description: "Who pays and who hauls" },
  { title: "Service & booking", description: "How the load is classified" },
  { title: "Pick-up", description: "Origin stops" },
  { title: "Drop-off", description: "Destination stops" },
  { title: "Files", description: "Optional documents" },
] as const;

const LAST_STEP_INDEX = STEP_ITEMS_META.length - 1;

const toNumberOrNull = (value?: string, fieldName?: string): number | null | undefined => {
  if (value === undefined) return undefined;
  if (fieldName === "customerRate" || fieldName === "carrierRate") {
    if (value === null || value === "")
      throw new Error(
        `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} is required`,
      );
  } else {
    if (value === null || value === "") return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    if (fieldName === "customerRate" || fieldName === "carrierRate")
      throw new Error(
        `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} must be a valid number`,
      );
    return null;
  }
  if ((fieldName === "customerRate" || fieldName === "carrierRate") && parsed <= 0)
    throw new Error(
      `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} must be greater than 0`,
    );
  return parsed;
};

const toNullableString = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const buildInitialValues = (load: Load) => {
  const {
    files: _f,
    branchId: _b,
    status: _s,
    statusChangedBy: _sc,
    createdAt: _ca,
    updatedAt: _ua,
    pickups,
    dropoffs,
    customerRate,
    carrierRate,
    temperature,
    ...rest
  } = load;
  return {
    ...rest,
    pickups,
    dropoffs,
    customerRate: customerRate != null ? String(customerRate) : undefined,
    carrierRate: carrierRate != null ? String(carrierRate) : undefined,
    temperature: temperature ?? undefined,
  };
};

const getFieldsForStep = (form: ReturnType<typeof Form.useForm>[0], step: number): NamePath[] => {
  switch (step) {
    case 0:
      return [
        "customer",
        "referenceNumber",
        "contactName",
        "customerRate",
        "paymentMethod",
        "paymentTerms",
        "carrierRate",
      ];
    case 1:
      return [
        "loadType",
        "serviceType",
        "serviceGivenAs",
        "commodity",
        "bookedAs",
        "soldAs",
        "weight",
      ];
    case 2: {
      const list = (form.getFieldValue("pickups") ?? []) as unknown[];
      return list.flatMap((_, i) => [
        ["pickups", i, "carrier"],
        ["pickups", i, "name"],
        ["pickups", i, "address"],
      ]);
    }
    case 3: {
      const list = (form.getFieldValue("dropoffs") ?? []) as unknown[];
      return list.flatMap((_, i) => [
        ["dropoffs", i, "carrier"],
        ["dropoffs", i, "name"],
        ["dropoffs", i, "address"],
      ]);
    }
    default:
      return [];
  }
};

const LoadEditModal: React.FC<LoadEditModalProps> = ({ open, load, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepVisited, setMaxStepVisited] = useState(LAST_STEP_INDEX);
  const [activeUploadCount, setActiveUploadCount] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<LoadFile[]>([]);
  const stepContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentStep(0);
    setMaxStepVisited(LAST_STEP_INDEX);
    setUploadedFiles(load.files ?? []);
    setFileList(
      (load.files ?? []).map((f) => ({ uid: f.id, name: f.fileName, status: "done" as const })),
    );
  }, [open, load]);

  useEffect(() => {
    void currentStep;
    if (!open || screens.md) return;
    stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep, open, screens.md]);

  const stepItems = STEP_ITEMS_META.map((meta, index) => ({
    title: meta.title,
    description: meta.description,
    disabled: index > maxStepVisited,
  }));

  const handleStepChange = (next: number) => {
    if (next <= maxStepVisited) setCurrentStep(next);
  };

  const handleNext = async () => {
    try {
      await form.validateFields(getFieldsForStep(form, currentStep));
      const advanced = currentStep + 1;
      setMaxStepVisited((prev) => Math.max(prev, advanced));
      setCurrentStep(advanced);
    } catch {
      // field-level errors shown by Ant Design
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  const { loading, run: update } = useRequest(
    async (payload: UpdateLoadDto) => loadApi.update(load.id, payload),
    {
      manual: true,
      onSuccess: () => {
        message.success("Load updated successfully");
        onSuccess();
      },
      onError: (error) => message.error(getErrorMessage(error)),
    },
  );

  const handleSubmit = async () => {
    if (activeUploadCount > 0) {
      message.warning("Wait for files to finish uploading.");
      return;
    }
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue(true);
    const pickups = (values.pickups ?? []) as Location[];
    const dropoffs = (values.dropoffs ?? []) as Location[];
    update({
      customer: values.customer,
      referenceNumber: values.referenceNumber,
      customerRate: toNumberOrNull(values.customerRate, "customerRate"),
      contactName: values.contactName,
      paymentMethod: values.paymentMethod,
      paymentTerms: values.paymentTerms,
      carrier: toNullableString(values.carrier),
      carrierPaymentMethod: toNullableString(values.carrierPaymentMethod),
      carrierRate: toNumberOrNull(values.carrierRate, "carrierRate"),
      chargeServiceFeeToOffice: values.chargeServiceFeeToOffice ?? false,
      loadType: values.loadType,
      serviceType: values.serviceType,
      serviceGivenAs: values.serviceGivenAs,
      commodity: values.commodity,
      bookedAs: values.bookedAs,
      soldAs: values.soldAs,
      weight: values.weight,
      temperature: toNullableString(values.temperature),
      pickups: pickups.map((p) => ({
        cityZipCode: toNullableString(p.cityZipCode),
        phone: toNullableString(p.phone),
        carrier: p.carrier,
        name: p.name,
        address: p.address,
      })),
      dropoffs: dropoffs.map((d) => ({
        cityZipCode: toNullableString(d.cityZipCode),
        phone: toNullableString(d.phone),
        carrier: d.carrier,
        name: d.name,
        address: d.address,
      })),
      files: uploadedFiles,
    });
  };

  const handleFileUpload = async (file: File): Promise<UploadFile | null> => {
    setActiveUploadCount((c) => c + 1);
    try {
      message.loading({ content: "Uploading file...", key: "upload" });
      const fileId = await fileApi.uploadFile(file);
      const fileEntry: LoadFile = { id: fileId, fileName: file.name, documentCategory: null };
      setUploadedFiles((prev) => [...prev, fileEntry]);
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
    setUploadedFiles((prev) => prev.filter((item) => item.id !== file.uid));
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    message.success("File removed");
    return true;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <Divider titlePlacement="start">Customer</Divider>
            <Row gutter={[16, 16]}>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Customer"
                  name="customer"
                  rules={[{ required: true, message: "Please enter customer name" }]}
                >
                  <Input placeholder="Enter customer name" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Reference Number"
                  name="referenceNumber"
                  rules={[{ required: true, message: "Please enter reference number" }]}
                >
                  <Input placeholder="Enter reference number" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Customer Rate"
                  name="customerRate"
                  rules={[
                    { required: true, message: "Please enter customer rate" },
                    {
                      validator: (_, value) => {
                        const n =
                          value === "" || value === null || value === undefined
                            ? null
                            : Number(value);
                        if (n === null || Number.isNaN(n) || n <= 0)
                          return Promise.reject(
                            new Error("Please enter a valid customer rate greater than 0"),
                          );
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input placeholder="Enter customer rate" type="number" min="0" step="0.01" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Contact Name"
                  name="contactName"
                  rules={[{ required: true, message: "Please enter contact name" }]}
                >
                  <Input placeholder="Enter contact name" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Payment Method"
                  name="paymentMethod"
                  rules={[{ required: true, message: "Please enter payment method" }]}
                >
                  <Input placeholder="Enter payment method" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Payment Terms"
                  name="paymentTerms"
                  rules={[{ required: true, message: "Please enter payment terms" }]}
                >
                  <Input placeholder="Enter payment terms" />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="start">Carrier</Divider>
            <Row gutter={[16, 16]}>
              <Col {...FORM_COL}>
                <Form.Item label="Carrier" name="carrier">
                  <Input placeholder="Enter carrier" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item label="Carrier Payment Method" name="carrierPaymentMethod">
                  <Input placeholder="Enter payment method" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Carrier Rate"
                  name="carrierRate"
                  rules={[
                    { required: true, message: "Please enter carrier rate" },
                    {
                      validator: (_, value) => {
                        const n =
                          value === "" || value === null || value === undefined
                            ? null
                            : Number(value);
                        if (n === null || Number.isNaN(n) || n <= 0)
                          return Promise.reject(
                            new Error("Please enter a valid carrier rate greater than 0"),
                          );
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input placeholder="Enter carrier rate" type="number" min="0" step="0.01" />
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 1:
        return (
          <>
            <Divider titlePlacement="start">Service</Divider>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  label="Charge Service Fee to Office"
                  name="chargeServiceFeeToOffice"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Load Type"
                  name="loadType"
                  rules={[{ required: true, message: "Please enter load type" }]}
                >
                  <Input placeholder="Enter load type" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Service Type"
                  name="serviceType"
                  rules={[{ required: true, message: "Please enter service type" }]}
                >
                  <Input placeholder="Enter service type" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Service Given As"
                  name="serviceGivenAs"
                  rules={[{ required: true, message: "Please enter service given as" }]}
                >
                  <Input placeholder="Enter service given as" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Commodity"
                  name="commodity"
                  rules={[{ required: true, message: "Please enter commodity" }]}
                >
                  <Input placeholder="Enter commodity" />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="start">Booking</Divider>
            <Row gutter={[16, 16]}>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Booked As"
                  name="bookedAs"
                  rules={[{ required: true, message: "Please enter booked as" }]}
                >
                  <Input placeholder="Enter booked as" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Sold As"
                  name="soldAs"
                  rules={[{ required: true, message: "Please enter sold as" }]}
                >
                  <Input placeholder="Enter sold as" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Weight"
                  name="weight"
                  rules={[{ required: true, message: "Please enter weight" }]}
                >
                  <Input placeholder="Enter weight" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item label="Temperature" name="temperature">
                  <Input placeholder="Enter temperature" />
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 2:
        return <LoadStopsFormList name="pickups" legLabel="Pick-up" />;

      case 3:
        return <LoadStopsFormList name="dropoffs" legLabel="Drop-off" />;

      case 4:
        return (
          <Form.Item label="Upload Files">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(file) => {
                handleFileUpload(file).then((uploaded) => {
                  if (uploaded) setFileList((prev) => [...prev, uploaded]);
                });
                return false;
              }}
              onRemove={handleFileRemove}
              iconRender={() => <DeleteOutlined />}
            >
              <Button icon={<UploadOutlined />} loading={activeUploadCount > 0}>
                Select Files
              </Button>
            </Upload>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {activeUploadCount > 0
                ? "Upload in progress… you can submit after it finishes."
                : "Supporting documents related to this load — multiple files allowed."}
            </Typography.Paragraph>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="Edit Load"
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={null}
      destroyOnHidden
    >
      <Steps
        current={currentStep}
        items={stepItems}
        direction={screens.md ? "horizontal" : "vertical"}
        size={screens.md ? "default" : "small"}
        onChange={handleStepChange}
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        scrollToFirstError={{ behavior: "smooth", block: "center" }}
        initialValues={buildInitialValues(load)}
      >
        <div ref={stepContentRef}>{renderStepContent()}</div>
      </Form>

      <Space
        wrap
        style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", width: "100%" }}
      >
        {currentStep > 0 && <Button onClick={handlePrev}>Previous</Button>}
        {currentStep < LAST_STEP_INDEX && (
          <Button type="primary" onClick={() => void handleNext()}>
            Next
          </Button>
        )}
        {currentStep === LAST_STEP_INDEX && (
          <Button
            type="primary"
            onClick={() => void handleSubmit()}
            loading={loading}
            disabled={activeUploadCount > 0}
          >
            Update Load
          </Button>
        )}
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </Modal>
  );
};

export default LoadEditModal;
