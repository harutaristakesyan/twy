import { useRequest } from "ahooks";
import { App, Button, Col, DatePicker, Form, Input, Modal, Row, Space } from "antd";
import dayjs from "dayjs";
import type React from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { submitCarrierRequest } from "../api/carrierRequestApi";
import type { CarrierKind } from "../types/carrier";
import type { SubmitCarrierRequestBody } from "../types/carrierRequest";

const { TextArea } = Input;

type FormValues = Omit<SubmitCarrierRequestBody, "kind" | "insuranceExpiry"> & {
  insuranceExpiry: dayjs.Dayjs;
};

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
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const { loading, run: submit } = useRequest(
    async (values: FormValues) => {
      await submitCarrierRequest({
        kind,
        carrierName: values.carrierName,
        mcDotNumber: values.mcDotNumber,
        equipmentType: values.equipmentType,
        insuranceExpiry: dayjs(values.insuranceExpiry).toISOString(),
        phone: values.phone,
        email: values.email,
        notes: values.notes,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Carrier request submitted for review");
        onSuccess();
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  return (
    <Modal
      title="Submit carrier request"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={submit}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
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
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="mcDotNumber"
              label="MC / DOT Number"
              rules={[{ required: true, message: "Please enter MC/DOT number" }]}
            >
              <Input placeholder="Enter MC/DOT number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="equipmentType"
              label="Equipment Type"
              rules={[{ required: true, message: "Please enter equipment type" }]}
            >
              <Input placeholder="e.g. Flatbed, Dry Van, Refrigerated" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
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
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Phone"
              rules={[{ required: true, message: "Please enter phone number" }]}
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
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
          </Col>
        </Row>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={2} />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
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
