import { useRequest } from "ahooks";
import { App, Button, DatePicker, Form, Input, Modal, Space } from "antd";
import dayjs from "dayjs";
import type React from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { updateCommunityLicense } from "../api/ciApi";
import type { CommunityLicense } from "../types/communityLicense";

interface CIEditModalProps {
  open: boolean;
  communityLicense: CommunityLicense;
  onCancel: () => void;
  onSuccess: () => void;
}

const CIEditModal: React.FC<CIEditModalProps> = ({
  open,
  communityLicense,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const { loading, run: submit } = useRequest(
    async (values: { ciNumber: string; validFrom: unknown; validTo: unknown }) => {
      await updateCommunityLicense({
        id: communityLicense.id,
        ciNumber: values.ciNumber,
        validFrom: dayjs(values.validFrom as Parameters<typeof dayjs>[0]).format("YYYY-MM-DD"),
        validTo: values.validTo
          ? dayjs(values.validTo as Parameters<typeof dayjs>[0]).format("YYYY-MM-DD")
          : null,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Community license updated successfully");
        onSuccess();
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  return (
    <Modal
      title="Edit Community License"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={520}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{
          ciNumber: communityLicense.ciNumber,
          validFrom: dayjs(communityLicense.validFrom),
          validTo: communityLicense.validTo ? dayjs(communityLicense.validTo) : undefined,
        }}
      >
        <Form.Item
          name="ciNumber"
          label="CI Number"
          rules={[
            { required: true, message: "CI number is required" },
            { max: 50, message: "CI number must be at most 50 characters" },
          ]}
        >
          <Input placeholder="e.g. CI-123456" />
        </Form.Item>

        <Form.Item
          name="validFrom"
          label="Valid From"
          rules={[{ required: true, message: "Valid from date is required" }]}
        >
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="validTo" label="Valid To">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CIEditModal;
