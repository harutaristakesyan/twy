import { ArrowLeftOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import {
  App,
  Button,
  Card,
  Flex,
  Form,
  Input,
  Space,
  Steps,
  Switch,
  Typography,
  Upload,
} from "antd";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { CreateLoadDto, LoadFile, Location } from "@/features/load/types/load";
import { fileApi } from "@/libs/fileApi";
import { getErrorMessage } from "@/utils/errorUtils";

const { Title } = Typography;

const CreateLoadPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<LoadFile[]>([]);

  const steps = [
    { title: "Customer", content: "Customer Information" },
    { title: "Carrier", content: "Carrier Information" },
    { title: "Service", content: "Service Information" },
    { title: "Booking", content: "Booking Information" },
    { title: "Pick-up", content: "Pick-up Location" },
    { title: "Drop-off", content: "Drop-off Location" },
    { title: "Files", content: "Additional Files" },
  ];

  const handleNext = async () => {
    try {
      await form.validateFields(getFieldsForStep(currentStep));
      setCurrentStep(currentStep + 1);
    } catch {
      // validateFields failed — Ant Design shows field-level errors
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await form.validateFields();

      const values = form.getFieldsValue(true);
      const pickups = (values.pickups ?? []) as Location[];
      const dropoffs = (values.dropoffs ?? []) as Location[];

      const toNumberOrNull = (value?: string, fieldName?: string): number | null | undefined => {
        if (value === undefined) return undefined;
        // For required fields (customerRate, carrierRate), don't allow null/empty
        if (fieldName === "customerRate" || fieldName === "carrierRate") {
          if (value === null || value === "") {
            throw new Error(
              `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} is required`,
            );
          }
        } else {
          if (value === null || value === "") return null;
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
          if (fieldName === "customerRate" || fieldName === "carrierRate") {
            throw new Error(
              `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} must be a valid number`,
            );
          }
          return null;
        }
        if ((fieldName === "customerRate" || fieldName === "carrierRate") && parsed <= 0) {
          throw new Error(
            `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} must be greater than 0`,
          );
        }
        return parsed;
      };

      const toNullableString = (value?: string | null): string | null | undefined => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      };

      const payload: CreateLoadDto = {
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
        files: uploadedFiles.length ? uploadedFiles : undefined,
      };

      await loadApi.create(payload);
      message.success("Load created successfully");
      navigate("/loads");
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/loads");
  };

  const handleFileUpload = async (file: File): Promise<UploadFile | null> => {
    try {
      message.loading({ content: "Uploading file...", key: "upload" });
      const fileId = await fileApi.uploadFile(file);
      const fileEntry: LoadFile = { id: fileId, fileName: file.name };
      setUploadedFiles((prev) => [...prev, fileEntry]);
      message.success({ content: "File uploaded successfully", key: "upload" });
      return {
        uid: fileId,
        name: file.name,
        status: "done",
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      message.error({ content: getErrorMessage(error), key: "upload" });
      return null;
    }
  };

  const handleFileRemove = (file: UploadFile) => {
    setUploadedFiles((prev) => prev.filter((item) => item.id !== file.uid));
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    message.success("File removed");
    return true;
  };

  const getFieldsForStep = (step: number): (string | string[])[] => {
    switch (step) {
      case 0: // Customer Information
        return [
          "customer",
          "referenceNumber",
          "contactName",
          "customerRate",
          "paymentMethod",
          "paymentTerms",
        ];
      case 1: // Carrier Information
        return ["carrierRate"];
      case 2: // Service Information
        return ["loadType", "serviceType", "serviceGivenAs", "commodity"];
      case 3: // Booking Information
        return ["bookedAs", "soldAs", "weight"];
      case 4: {
        // Pick-up stops (Form.List)
        const list = (form.getFieldValue("pickups") ?? []) as unknown[];
        return list.flatMap((_, i) => [
          ["pickups", i, "carrier"],
          ["pickups", i, "name"],
          ["pickups", i, "address"],
        ]);
      }
      case 5: {
        const list = (form.getFieldValue("dropoffs") ?? []) as unknown[];
        return list.flatMap((_, i) => [
          ["dropoffs", i, "carrier"],
          ["dropoffs", i, "name"],
          ["dropoffs", i, "address"],
        ]);
      }
      case 6: // Files
        return [];
      default:
        return [];
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Customer Information
        return (
          <>
            <Form.Item
              label="Customer"
              name="customer"
              rules={[{ required: true, message: "Please enter customer name" }]}
            >
              <Input placeholder="Enter customer name" size="large" />
            </Form.Item>
            <Form.Item
              label="Reference Number"
              name="referenceNumber"
              rules={[{ required: true, message: "Please enter reference number" }]}
            >
              <Input placeholder="Enter reference number" size="large" />
            </Form.Item>
            <Form.Item
              label="Customer Rate"
              name="customerRate"
              rules={[
                { required: true, message: "Please enter customer rate" },
                {
                  validator: (_, value) => {
                    const numValue =
                      value === "" || value === null || value === undefined ? null : Number(value);
                    if (numValue === null || Number.isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(
                        new Error("Please enter a valid customer rate greater than 0"),
                      );
                    }
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
            <Form.Item
              label="Contact Name"
              name="contactName"
              rules={[{ required: true, message: "Please enter contact name" }]}
            >
              <Input placeholder="Enter contact name" size="large" />
            </Form.Item>
            <Form.Item
              label="Payment Method"
              name="paymentMethod"
              rules={[{ required: true, message: "Please enter payment method" }]}
            >
              <Input placeholder="Enter payment method" size="large" />
            </Form.Item>
            <Form.Item
              label="Payment Terms"
              name="paymentTerms"
              rules={[{ required: true, message: "Please enter payment terms" }]}
            >
              <Input placeholder="Enter payment terms" size="large" />
            </Form.Item>
          </>
        );

      case 1: // Carrier Information
        return (
          <>
            <Form.Item label="Carrier" name="carrier">
              <Input placeholder="Enter carrier" size="large" />
            </Form.Item>
            <Form.Item label="Carrier Payment Method" name="carrierPaymentMethod">
              <Input placeholder="Enter payment method" size="large" />
            </Form.Item>
            <Form.Item
              label="Carrier Rate"
              name="carrierRate"
              rules={[
                { required: true, message: "Please enter carrier rate" },
                {
                  validator: (_, value) => {
                    const numValue =
                      value === "" || value === null || value === undefined ? null : Number(value);
                    if (numValue === null || Number.isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(
                        new Error("Please enter a valid carrier rate greater than 0"),
                      );
                    }
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
          </>
        );

      case 2: // Service Information
        return (
          <>
            <Form.Item
              label="Charge Service Fee to Office"
              name="chargeServiceFeeToOffice"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Load Type"
              name="loadType"
              rules={[{ required: true, message: "Please enter load type" }]}
            >
              <Input placeholder="Enter load type" size="large" />
            </Form.Item>
            <Form.Item
              label="Service Type"
              name="serviceType"
              rules={[{ required: true, message: "Please enter service type" }]}
            >
              <Input placeholder="Enter service type" size="large" />
            </Form.Item>
            <Form.Item
              label="Service Given As"
              name="serviceGivenAs"
              rules={[{ required: true, message: "Please enter service given as" }]}
            >
              <Input placeholder="Enter service given as" size="large" />
            </Form.Item>
            <Form.Item
              label="Commodity"
              name="commodity"
              rules={[{ required: true, message: "Please enter commodity" }]}
            >
              <Input placeholder="Enter commodity" size="large" />
            </Form.Item>
          </>
        );

      case 3: // Booking Information
        return (
          <>
            <Form.Item
              label="Booked As"
              name="bookedAs"
              rules={[{ required: true, message: "Please enter booked as" }]}
            >
              <Input placeholder="Enter booked as" size="large" />
            </Form.Item>
            <Form.Item
              label="Sold As"
              name="soldAs"
              rules={[{ required: true, message: "Please enter sold as" }]}
            >
              <Input placeholder="Enter sold as" size="large" />
            </Form.Item>
            <Form.Item
              label="Weight"
              name="weight"
              rules={[{ required: true, message: "Please enter weight" }]}
            >
              <Input placeholder="Enter weight" size="large" />
            </Form.Item>
            <Form.Item label="Temperature" name="temperature">
              <Input placeholder="Enter temperature" size="large" />
            </Form.Item>
          </>
        );

      case 4: // Pick-up Location
        return <LoadStopsFormList name="pickups" legLabel="Pick-up" />;

      case 5: // Drop-off Location
        return <LoadStopsFormList name="dropoffs" legLabel="Drop-off" />;

      case 6: // Files
        return (
          <Form.Item label="Upload Files">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(file) => {
                handleFileUpload(file).then((uploaded) => {
                  if (uploaded) {
                    setFileList((prev) => [...prev, uploaded]);
                  }
                });
                return false; // Prevent auto upload
              }}
              onRemove={handleFileRemove}
              iconRender={() => <DeleteOutlined />}
            >
              <Button icon={<UploadOutlined />} size="large">
                Select Files
              </Button>
            </Upload>
            <div style={{ marginTop: 8, color: "#666" }}>
              Upload documents related to this load (multiple files allowed)
            </div>
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
        <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
          Back to Loads
        </Button>
      </Flex>

      <Card>
        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        <Form
          form={form}
          layout="vertical"
          size="large"
          initialValues={{
            chargeServiceFeeToOffice: false,
            pickups: [
              {
                cityZipCode: null,
                phone: null,
                carrier: "",
                name: "",
                address: "",
              },
            ],
            dropoffs: [
              {
                cityZipCode: null,
                phone: null,
                carrier: "",
                name: "",
                address: "",
              },
            ],
          }}
        >
          {renderStepContent()}
        </Form>

        <Flex justify="space-between" style={{ marginTop: 32 }}>
          <Button onClick={handleCancel} size="large">
            Cancel
          </Button>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev} size="large">
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext} size="large">
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button type="primary" onClick={handleSubmit} loading={loading} size="large">
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
