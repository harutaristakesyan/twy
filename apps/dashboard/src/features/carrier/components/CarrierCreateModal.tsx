import { Alert, Button, DatePicker, Form, Input, Modal, message, Select, Space } from "antd";
import dayjs from "dayjs";
import type React from "react";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { createCarrier } from "../api/carrierApi";
import { type CarrierFormData, type CarrierKind, CarrierStatus } from "../types/carrier";

const { TextArea } = Input;

interface CarrierCreateModalProps {
  open: boolean;
  kind: CarrierKind;
  onCancel: () => void;
  onSuccess: () => void;
}

const CarrierCreateModal: React.FC<CarrierCreateModalProps> = ({
  open,
  kind,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  type FormValues = Omit<CarrierFormData, "insuranceExpiry" | "kind"> & {
    insuranceExpiry?: dayjs.Dayjs | null;
  };

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const formData: CarrierFormData = {
        kind,
        carrierName: values.carrierName,
        mcDotNumber: values.mcDotNumber,
        equipmentType: values.equipmentType,
        insuranceExpiry: values.insuranceExpiry
          ? dayjs(values.insuranceExpiry).toISOString()
          : undefined,
        phone: values.phone,
        email: values.email,
        notes: values.notes,
        status: values.status,
      };

      await createCarrier(formData);
      message.success("Carrier created successfully");
      form.resetFields();
      onSuccess();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes("duplicate") || errorMessage.includes("unique constraint")) {
        message.error(
          `MC/DOT Number "${values.mcDotNumber}" already exists. Please use a different number.`,
        );
      } else {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal title="Add New Carrier" open={open} onCancel={handleCancel} footer={null} width={600}>
      <Alert
        message="Carrier Information"
        description="Add a new carrier. Carrier name and MC/DOT number are required."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="carrierName"
          label="Carrier Name"
          rules={[
            { required: true, message: "Please enter carrier name" },
            { min: 2, message: "Carrier name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter carrier name" />
        </Form.Item>

        <Form.Item
          name="mcDotNumber"
          label="MC / DOT Number"
          rules={[{ required: true, message: "Please enter MC/DOT number" }]}
        >
          <Input placeholder="Enter MC/DOT number" />
        </Form.Item>

        <Form.Item name="equipmentType" label="Equipment Type">
          <Input placeholder="Enter equipment type (e.g., Flatbed, Dry Van, Refrigerated)" />
        </Form.Item>

        <Form.Item name="insuranceExpiry" label="Insurance Expiry">
          <DatePicker
            style={{ width: "100%" }}
            placeholder="Select insurance expiry date"
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: "email", message: "Please enter a valid email address" }]}
        >
          <Input placeholder="Enter email address" />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={3} />
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: "Please select a status" }]}
          initialValue={CarrierStatus.APPROVED}
        >
          <Select placeholder="Select status">
            <Select.Option value={CarrierStatus.APPROVED}>Approved</Select.Option>
            <Select.Option value={CarrierStatus.DENIED}>Denied</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Add Carrier
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CarrierCreateModal;
