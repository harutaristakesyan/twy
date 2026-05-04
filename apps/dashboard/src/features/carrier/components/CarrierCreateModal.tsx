import { Button, DatePicker, Form, Input, Modal, message, Space } from "antd";
import dayjs from "dayjs";
import type React from "react";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { submitCarrierRequest } from "../api/carrierRequestApi";
import type { CarrierKind } from "../types/carrier";
import type { SubmitCarrierRequestBody } from "../types/carrierRequest";

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

  type FormValues = Omit<SubmitCarrierRequestBody, "kind" | "insuranceExpiry"> & {
    insuranceExpiry: dayjs.Dayjs;
  };

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload: SubmitCarrierRequestBody = {
        kind,
        carrierName: values.carrierName,
        mcDotNumber: values.mcDotNumber,
        equipmentType: values.equipmentType,
        insuranceExpiry: dayjs(values.insuranceExpiry).toISOString(),
        phone: values.phone,
        email: values.email,
        notes: values.notes,
      };

      await submitCarrierRequest(payload);
      message.success("Carrier request submitted for review");
      form.resetFields();
      onSuccess();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes("duplicate") || errorMessage.includes("unique constraint")) {
        Modal.error({
          title: "Duplicate MC/DOT",
          content: `MC/DOT number "${values.mcDotNumber}" is already in use. Please use a different number.`,
        });
      } else {
        Modal.error({ title: "Request failed", content: errorMessage });
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
    <Modal
      title="Submit carrier request"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="carrierName"
          label="Carrier name"
          rules={[
            { required: true, message: "Please enter carrier name" },
            { min: 2, message: "Carrier name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter carrier name" />
        </Form.Item>

        <Form.Item
          name="mcDotNumber"
          label="MC / DOT number"
          rules={[{ required: true, message: "Please enter MC/DOT number" }]}
        >
          <Input placeholder="Enter MC/DOT number" />
        </Form.Item>

        <Form.Item
          name="equipmentType"
          label="Equipment type"
          rules={[{ required: true, message: "Please enter equipment type" }]}
        >
          <Input placeholder="e.g. Flatbed, Dry Van, Refrigerated" />
        </Form.Item>

        <Form.Item
          name="insuranceExpiry"
          label="Insurance expiry"
          rules={[{ required: true, message: "Please select insurance expiry date" }]}
        >
          <DatePicker
            style={{ width: "100%" }}
            placeholder="Select insurance expiry date"
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone"
          rules={[{ required: true, message: "Please enter phone number" }]}
        >
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter email address" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
        >
          <Input placeholder="Enter email address" />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={3} />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit request
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CarrierCreateModal;
