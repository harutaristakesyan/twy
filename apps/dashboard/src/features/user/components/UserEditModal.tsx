import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
} from "antd";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBranches } from "@/features/branch/api/branchApi";
import type { Branch } from "@/features/branch/types/branch";
import TeamSelect from "@/features/team/components/TeamSelect";
import { getErrorMessage } from "@/utils/errorUtils";
import { updateUser } from "../api/userApi";
import type { UpdateUserRequest, User } from "../types/user";

interface UserEditModalProps {
  open: boolean;
  user: User;
  onCancel: () => void;
  onSuccess: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ open, user, onCancel, onSuccess }) => {
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

  // Set form values
  useEffect(() => {
    if (open && user) {
      const branchId = user.branch?.id || user.branchId;

      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        branch: branchId,
        teamId: user.teamId ?? undefined,
      });
    }
  }, [open, user, form]);

  interface UserEditFormValues {
    isActive: boolean;
    branch?: string | null;
    teamId?: string | null;
  }

  const handleSubmit = async (values: UserEditFormValues) => {
    setLoading(true);
    try {
      const updateData: UpdateUserRequest = {
        id: user.id,
        isActive: values.isActive,
        branch: values.branch,
        teamId: values.teamId,
      };

      await updateUser(updateData);
      message.success("User updated successfully");
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
    <Modal
      title="Edit User"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          isActive: user?.isActive,
          branch: user?.branch?.id || user?.branchId,
          teamId: user?.teamId ?? undefined,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="First Name">
              <Input value={user?.firstName} disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Last Name">
              <Input value={user?.lastName} disabled />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Email">
          <Input value={user?.email} disabled />
        </Form.Item>

        <Divider />

        <Form.Item name="branch" label="Branch (optional)">
          <Select
            placeholder="Search and select branch"
            allowClear
            showSearch={{ filterOption: false, onSearch: handleBranchSearch }}
            onPopupScroll={handleBranchScroll}
            loading={loadingBranches}
            notFoundContent={loadingBranches ? <Spin size="small" /> : "No branches found"}
            options={branches.map((b) => ({ value: b.id, label: b.name, owner: b.owner ?? null }))}
            optionRender={(option) => (
              <div>
                <div style={{ fontWeight: 500 }}>{option.label}</div>
                {option.data.owner && (
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    Owner: {option.data.owner.firstName} {option.data.owner.lastName}
                  </div>
                )}
              </div>
            )}
            popupRender={(menu) => (
              <>
                {menu}
                {loadingBranches && hasMoreBranches && (
                  <div style={{ textAlign: "center", padding: "8px" }}>
                    <Spin size="small" /> Loading more...
                  </div>
                )}
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="teamId" label="Team">
          <TeamSelect
            initialOption={
              user?.teamId && user?.teamName
                ? { value: user.teamId, label: user.teamName }
                : undefined
            }
          />
        </Form.Item>

        <Form.Item name="isActive" label="Status" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update User
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserEditModal;
