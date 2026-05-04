import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Space } from "antd";
import type React from "react";

const emptyStop = () => ({
  cityZipCode: null as string | null,
  phone: null as string | null,
  carrier: "",
  name: "",
  address: "",
});

export interface LoadStopsFormListProps {
  name: "pickups" | "dropoffs";
  /** e.g. "Pick-up" or "Drop-off" — used for card titles and add button */
  legLabel: string;
}

export const LoadStopsFormList: React.FC<LoadStopsFormListProps> = ({ name, legLabel }) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {fields.map((field, index) => (
          <Card
            key={field.key}
            size="small"
            title={`${legLabel} stop ${index + 1}`}
            extra={
              fields.length > 1 ? (
                <Button
                  type="link"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => {
                    remove(field.name);
                  }}
                >
                  Remove
                </Button>
              ) : null
            }
          >
            <Form.Item label="City / Zipcode" name={[field.name, "cityZipCode"]}>
              <Input placeholder="Enter city or zipcode" />
            </Form.Item>
            <Form.Item label="Phone Number" name={[field.name, "phone"]}>
              <Input placeholder="Enter phone number" />
            </Form.Item>
            <Form.Item
              label="Select Carrier"
              name={[field.name, "carrier"]}
              rules={[{ required: true, message: "Please enter carrier" }]}
            >
              <Input placeholder="Enter carrier" />
            </Form.Item>
            <Form.Item
              label="Name"
              name={[field.name, "name"]}
              rules={[{ required: true, message: "Please enter name" }]}
            >
              <Input placeholder="Enter name" />
            </Form.Item>
            <Form.Item
              label="Address"
              name={[field.name, "address"]}
              rules={[{ required: true, message: "Please enter address" }]}
            >
              <Input.TextArea placeholder="Enter address" rows={3} />
            </Form.Item>
          </Card>
        ))}
        <Button type="dashed" onClick={() => add(emptyStop())} block icon={<PlusOutlined />}>
          Add {legLabel} stop
        </Button>
      </Space>
    )}
  </Form.List>
);
