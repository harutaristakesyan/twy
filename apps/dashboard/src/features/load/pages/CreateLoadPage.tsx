import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Grid,
  Input,
  Row,
  Space,
  Steps,
  Switch,
  Typography,
} from "antd";
import type { NamePath } from "antd/es/form/interface";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CarrierAutocomplete from "@/features/carrier/components/CarrierAutocomplete";
import type { FileUploaderHandle, FileUploaderValueItem } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { CreateLoadDto, Location } from "@/features/load/types/load";
import BrokerAutocomplete from "@/features/outside-broker/components/BrokerAutocomplete";
import { getErrorMessage } from "@/utils/errorUtils";

const { Title } = Typography;

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

const CreateLoadPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepVisited, setMaxStepVisited] = useState(0);
  const [uploaderItems, setUploaderItems] = useState<FileUploaderValueItem[]>([]);
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const isBusy = uploaderItems.some((i) => i.status === "uploading");

  useEffect(() => {
    void currentStep;
    if (!screens.md) {
      stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep, screens.md]);

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

  const { loading, run: create } = useRequest(
    async (payload: CreateLoadDto) => loadApi.create(payload),
    {
      manual: true,
      onSuccess: () => {
        uploaderRef.current?.commit();
        message.success("Load created successfully");
        navigate("/loads");
      },
      onError: (error) => message.error(getErrorMessage(error)),
    },
  );

  const handleSubmit = async () => {
    if (isBusy) {
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
    const filesPayload = uploaderItems
      .filter((i) => i.status === "done" && i.fileId)
      .map((i) => ({
        id: i.fileId as string,
        fileName: i.name,
        documentCategory: null as string | null,
      }));
    create({
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
      files: filesPayload.length ? filesPayload : undefined,
    });
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
                  <BrokerAutocomplete placeholder="Enter customer name" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Reference Number"
                  name="referenceNumber"
                  rules={[{ required: true, message: "Please enter reference number" }]}
                >
                  <Input placeholder="Enter reference number" size="large" />
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
                  <Input
                    placeholder="Enter customer rate"
                    size="large"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Contact Name"
                  name="contactName"
                  rules={[{ required: true, message: "Please enter contact name" }]}
                >
                  <Input placeholder="Enter contact name" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Payment Method"
                  name="paymentMethod"
                  rules={[{ required: true, message: "Please enter payment method" }]}
                >
                  <Input placeholder="Enter payment method" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Payment Terms"
                  name="paymentTerms"
                  rules={[{ required: true, message: "Please enter payment terms" }]}
                >
                  <Input placeholder="Enter payment terms" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="start">Carrier</Divider>
            <Row gutter={[16, 16]}>
              <Col {...FORM_COL}>
                <Form.Item label="Carrier" name="carrier">
                  <CarrierAutocomplete placeholder="Enter carrier" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item label="Carrier Payment Method" name="carrierPaymentMethod">
                  <Input placeholder="Enter payment method" size="large" />
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
                  <Input
                    placeholder="Enter carrier rate"
                    size="large"
                    type="number"
                    min="0"
                    step="0.01"
                  />
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
                  <Input placeholder="Enter load type" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Service Type"
                  name="serviceType"
                  rules={[{ required: true, message: "Please enter service type" }]}
                >
                  <Input placeholder="Enter service type" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Service Given As"
                  name="serviceGivenAs"
                  rules={[{ required: true, message: "Please enter service given as" }]}
                >
                  <Input placeholder="Enter service given as" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Commodity"
                  name="commodity"
                  rules={[{ required: true, message: "Please enter commodity" }]}
                >
                  <Input placeholder="Enter commodity" size="large" />
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
                  <Input placeholder="Enter booked as" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Sold As"
                  name="soldAs"
                  rules={[{ required: true, message: "Please enter sold as" }]}
                >
                  <Input placeholder="Enter sold as" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item
                  label="Weight"
                  name="weight"
                  rules={[{ required: true, message: "Please enter weight" }]}
                >
                  <Input placeholder="Enter weight" size="large" />
                </Form.Item>
              </Col>
              <Col {...FORM_COL}>
                <Form.Item label="Temperature" name="temperature">
                  <Input placeholder="Enter temperature" size="large" />
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
            <FileUploader
              ref={uploaderRef}
              max={MAX_FILES_DEFAULT}
              buttonLabel="Select Files"
              onChange={setUploaderItems}
              helpText="Supporting documents related to this load — multiple files allowed."
            />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  return (
    <Flex vertical gap={24}>
      <Flex justify="space-between" align="center">
        <Title level={2} style={{ margin: 0 }}>
          Create New Load
        </Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/loads")}>
          Back to Loads
        </Button>
      </Flex>

      <Card>
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
          size="large"
          initialValues={{
            chargeServiceFeeToOffice: false,
            pickups: [{ cityZipCode: null, phone: null, carrier: "", name: "", address: "" }],
            dropoffs: [{ cityZipCode: null, phone: null, carrier: "", name: "", address: "" }],
          }}
        >
          <div ref={stepContentRef}>{renderStepContent()}</div>
        </Form>

        <Flex justify="space-between" style={{ marginTop: 32 }} wrap="wrap" gap={8}>
          <Button onClick={() => navigate("/loads")} size="large">
            Cancel
          </Button>
          <Space wrap>
            {currentStep > 0 && (
              <Button onClick={handlePrev} size="large">
                Previous
              </Button>
            )}
            {currentStep < LAST_STEP_INDEX && (
              <Button type="primary" onClick={() => void handleNext()} size="large">
                Next
              </Button>
            )}
            {currentStep === LAST_STEP_INDEX && (
              <Button
                type="primary"
                onClick={() => void handleSubmit()}
                loading={loading}
                disabled={isBusy}
                size="large"
              >
                Create Load
              </Button>
            )}
          </Space>
        </Flex>
      </Card>
    </Flex>
  );
};

export default CreateLoadPage;
