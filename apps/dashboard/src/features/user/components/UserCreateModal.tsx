import { Alert, Button, Form, Input, Modal, message, Select, Space, Spin, Switch } from "antd";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBranches } from "@/features/branch/api/branchApi";
import type { Branch } from "@/features/branch/types/branch";
import TeamSelect from "@/features/team/components/TeamSelect";
import { getErrorMessage } from "@/utils/errorUtils";
import { createUser } from "../api/userApi";
import type { UserFormData } from "../types/user";

const { Option } = Select;

interface UserCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const UserCreateModal: React.FC<UserCreateModalProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Branch select state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchPage, setBranchPage] = useState(0);
  const [_branchTotal, setBranchTotal] = useState(0);
  const [branchSearch, setBranchSearch] = useState("");
  const [hasMoreBranches, setHasMoreBranches] = useState(true);
  const branchSearchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isInitialFetchRef = useRef(false);

  // Fetch branches
  const fetchBranches = useCallback(async (page: number, search: string, append = false) => {
    setLoadingBranches(true);
    try {
      const response = await getBranches({
        page,
        limit: 20,
        query: search || undefined,
      });

      if (append) {
        setBranches((prev) => [...prev, ...response.branches]);
      } else {
        setBranches(response.branches);
      }

      setBranchTotal(response.total);
      setHasMoreBranches((page + 1) * 20 < response.total);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  // Load initial branches when modal opens
  useEffect(() => {
    if (open && !isInitialFetchRef.current) {
      isInitialFetchRef.current = true;
      setBranchPage(0);
      setBranchSearch("");
      setHasMoreBranches(true);
      fetchBranches(0, "");
    } else if (!open) {
      isInitialFetchRef.current = false;
    }
  }, [open, fetchBranches]);

  const handleSubmit = async (values: UserFormData) => {
    setLoading(true);
    try {
      await createUser(values);
      message.success("User created successfully");
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setBranches([]);
    setBranchPage(0);
    setBranchSearch("");
    onCancel();
  };

  // Handle branch search
  const handleBranchSearch = (value: string) => {
    if (branchSearchTimeoutRef.current) {
      clearTimeout(branchSearchTimeoutRef.current);
    }

    branchSearchTimeoutRef.current = setTimeout(() => {
      setBranchSearch(value);
      setBranchPage(0);
      fetchBranches(0, value, false);
    }, 300);
  };

  // Handle branch select scroll (infinite scroll)
  const handleBranchScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10;

    if (isBottom && !loadingBranches && hasMoreBranches) {
      const nextPage = branchPage + 1;
      setBranchPage(nextPage);
      fetchBranches(nextPage, branchSearch, true);
    }
  };

  return (
    <Modal title="Create New User" open={open} onCancel={handleCancel} footer={null} width={600}>
      <Alert
        message="User Creation"
        description="First name, last name, and email are required. The user will receive an email with login credentials."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} id="userCreateForm">
        <Form.Item
          name="firstName"
          label="First Name"
          rules={[
            { required: true, message: "Please enter first name" },
            { min: 2, message: "First name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter first name" id="create-firstName" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[
            { required: true, message: "Please enter last name" },
            { min: 2, message: "Last name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter last name" id="create-lastName" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input placeholder="Enter email address" id="create-email" />
        </Form.Item>

        <Form.Item name="branch" label="Branch (optional)">
          <Select
            placeholder="Search and select branch"
            allowClear
            showSearch
            filterOption={false}
            onSearch={handleBranchSearch}
            onPopupScroll={handleBranchScroll}
            loading={loadingBranches}
            notFoundContent={loadingBranches ? <Spin size="small" /> : "No branches found"}
            optionLabelProp="label"
          >
            {branches.map((branch) => (
              <Option key={branch.id} value={branch.id} label={branch.name}>
                <div>
                  <div style={{ fontWeight: 500 }}>{branch.name}</div>
                  {branch.owner && (
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      Owner: {branch.owner.firstName} {branch.owner.lastName}
                    </div>
                  )}
                </div>
              </Option>
            ))}
            {loadingBranches && hasMoreBranches && (
              <Option key="loading" disabled>
                <div style={{ textAlign: "center", padding: "8px" }}>
                  <Spin size="small" /> Loading more...
                </div>
              </Option>
            )}
          </Select>
        </Form.Item>

        <Form.Item name="teamId" label="Team">
          <TeamSelect />
        </Form.Item>

        <Form.Item name="isActive" label="Status" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create User
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserCreateModal;
