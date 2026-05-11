import { useRequest } from "ahooks";
import { App, Button, DatePicker, Form, Input, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import type React from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { updateCarrier } from "../api/carrierApi";
import type { Carrier, CarrierFormData, UpdateCarrierRequest } from "../types/carrier";
import { CarrierStatus } from "../types/carrier";

const { TextArea } = Input;

type FormValues = Omit<CarrierFormData, "insuranceExpiry" | "kind"> & {
  insuranceExpiry: dayjs.Dayjs;
};

interface CarrierEditModalProps {
  open: boolean;
  carrier: Carrier;
  onCancel: () => void;
  onSuccess: () => void;
}

const CarrierEditModal: React.FC<CarrierEditModalProps> = ({
  open,
  carrier,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const { loading, run: submit } = useRequest(
    async (values: FormValues) => {
      const updateData: UpdateCarrierRequest = {
        id: carrier.id,
        carrierName: values.carrierName,
        mcDotNumber: values.mcDotNumber,
        equipmentType: values.equipmentType,
        insuranceExpiry: dayjs(values.insuranceExpiry).toISOString(),
        phone: values.phone,
        email: values.email,
        notes: values.notes,
        status: values.status,
      };
      await updateCarrier(updateData);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Carrier updated successfully");
        onSuccess();
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  return (
    <Modal
      title="Edit Carrier"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{
          carrierName: carrier.carrierName,
          mcDotNumber: carrier.mcDotNumber,
          equipmentType: carrier.equipmentType || "",
          insuranceExpiry: carrier.insuranceExpiry ? dayjs(carrier.insuranceExpiry) : null,
          phone: carrier.phone || "",
          email: carrier.email || "",
          notes: carrier.notes || "",
          status: carrier.status,
        }}
      >
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

        <Form.Item
          name="equipmentType"
          label="Equipment Type"
          rules={[{ required: true, message: "Please enter equipment type" }]}
        >
          <Input placeholder="Enter equipment type (e.g., Flatbed, Dry Van, Refrigerated)" />
        </Form.Item>

        <Form.Item
          name="insuranceExpiry"
          label="Insurance Expiry"
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

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select
            placeholder="Select status"
            options={[
              { value: CarrierStatus.APPROVED, label: "Approved" },
              { value: CarrierStatus.DENIED, label: "Denied" },
            ]}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Carrier
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CarrierEditModal;
