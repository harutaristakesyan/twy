import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { CollapseProps } from "antd";
import { Button, Col, Collapse, Flex, Form, Input, Row, Typography } from "antd";
import type React from "react";
import { useEffect, useRef, useState } from "react";

const emptyStop = () => ({
  cityZipCode: null as string | null,
  phone: null as string | null,
  carrier: "",
  name: "",
  address: "",
});

export interface LoadStopsFormListProps {
  name: "pickups" | "dropoffs";
  legLabel: string;
}

const STOP_COL = { xs: 24 as const, md: 12 as const };

type ListField = { key: React.Key; name: number };

interface LoadStopsFormListInnerProps {
  listName: LoadStopsFormListProps["name"];
  legLabel: string;
  fields: ListField[];
  add: (defaultValue?: unknown) => void;
  remove: (index: number | number[]) => void;
}

const LoadStopsFormListInner: React.FC<LoadStopsFormListInnerProps> = ({
  listName,
  legLabel,
  fields,
  add,
  remove,
}) => {
  const form = Form.useFormInstance();
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const prevLenRef = useRef<number | null>(null);

  useEffect(() => {
    const ids = fields.map((f) => String(f.key));
    const len = fields.length;

    if (prevLenRef.current === null) {
      prevLenRef.current = len;
      const only = ids[len - 1];
      if (only) setActiveKeys([only]);
      return;
    }

    if (len > prevLenRef.current) {
      const added = ids.slice(prevLenRef.current);
      setActiveKeys((k) => [...new Set([...k, ...added])]);
    } else if (len < prevLenRef.current) {
      const keep = new Set(ids);
      setActiveKeys((k) => k.filter((x) => keep.has(x)));
    }
    prevLenRef.current = len;
  }, [fields]);

  const handleCollapseChange: CollapseProps["onChange"] = (keys) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const items: CollapseProps["items"] = fields.map((field, index) => ({
    key: String(field.key),
    label: (
      <Flex
        justify="space-between"
        align="flex-start"
        gap={12}
        style={{ width: "100%", paddingRight: 4 }}
      >
        <Flex vertical style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong>
            {legLabel} stop {index + 1}
          </Typography.Text>
          <Form.Item dependencies={[[listName, field.name, "address"]]} noStyle>
            {() => {
              const stops =
                (form.getFieldValue(listName) as Array<{ address?: string } | undefined>) ?? [];
              const row = stops[field.name];
              const raw = row?.address?.trim();
              const preview =
                raw && raw.length > 0
                  ? raw.length > 72
                    ? `${raw.slice(0, 72)}…`
                    : raw
                  : "No address yet — expand to edit";
              return (
                <Typography.Paragraph
                  type="secondary"
                  ellipsis={{ rows: 2 }}
                  style={{ margin: "4px 0 0", fontSize: 12 }}
                >
                  {preview}
                </Typography.Paragraph>
              );
            }}
          </Form.Item>
        </Flex>
        {fields.length > 1 && (
          <Button
            type="link"
            danger
            size="small"
            icon={<MinusCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              remove(field.name);
            }}
          >
            Remove
          </Button>
        )}
      </Flex>
    ),
    children: (
      <Row gutter={[16, 16]}>
        <Col {...STOP_COL}>
          <Form.Item label="City / Zipcode" name={[field.name, "cityZipCode"]}>
            <Input placeholder="Enter city or zipcode" />
          </Form.Item>
        </Col>
        <Col {...STOP_COL}>
          <Form.Item label="Phone Number" name={[field.name, "phone"]}>
            <Input placeholder="Enter phone number" />
          </Form.Item>
        </Col>
        <Col {...STOP_COL}>
          <Form.Item
            label="Select Carrier"
            name={[field.name, "carrier"]}
            rules={[{ required: true, message: "Please enter carrier" }]}
          >
            <Input placeholder="Enter carrier" />
          </Form.Item>
        </Col>
        <Col {...STOP_COL}>
          <Form.Item
            label="Name"
            name={[field.name, "name"]}
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label="Address"
            name={[field.name, "address"]}
            rules={[{ required: true, message: "Please enter address" }]}
          >
            <Input.TextArea placeholder="Enter address" rows={3} />
          </Form.Item>
        </Col>
      </Row>
    ),
  }));

  return (
    <Flex vertical gap="middle">
      <Collapse
        bordered
        size="small"
        expandIconPlacement="start"
        activeKey={activeKeys}
        onChange={handleCollapseChange}
        items={items}
      />
      <Button type="dashed" onClick={() => add(emptyStop())} block icon={<PlusOutlined />}>
        Add {legLabel} stop
      </Button>
    </Flex>
  );
};

export const LoadStopsFormList: React.FC<LoadStopsFormListProps> = ({ name, legLabel }) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <LoadStopsFormListInner
        listName={name}
        legLabel={legLabel}
        fields={fields}
        add={add}
        remove={remove}
      />
    )}
  </Form.List>
);
