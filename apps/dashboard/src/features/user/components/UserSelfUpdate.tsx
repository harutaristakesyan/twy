import {
  CameraOutlined,
  CloseOutlined,
  EditOutlined,
  LockOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  message,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { selfUpdateUser, uploadProfilePicture } from "../api/userApi";
import type { SelfUpdateRequest } from "../types/user";
import ChangePasswordModal from "./ChangePasswordModal";

const { Title, Text } = Typography;

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const UserSelfUpdate: React.FC = () => {
  const [form] = Form.useForm();
  const { user, loading: userLoading, refetch, authMe } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }, [user, form]);

  const handleSubmit = async (values: SelfUpdateRequest) => {
    setSaving(true);
    try {
      await selfUpdateUser(values);
      message.success("Profile updated successfully");
      setIsEditing(false);
      await refetch();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setIsEditing(false);
  };

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
        message.error("Only JPEG, PNG, and WebP images are supported");
        return;
      }
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        message.error("Image must be smaller than 5 MB");
        return;
      }

      setUploadingAvatar(true);
      try {
        await uploadProfilePicture(file);
        await refetch();
        message.success("Profile picture updated");
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [refetch],
  );

  if (!user) {
    return <Card loading={userLoading} />;
  }

  const pictureFileId = user.profilePictureFileId;

  return (
    <Card>
      <Row gutter={24} align="middle">
        <Col>
          <Tooltip title="Click to change profile picture">
            <button
              type="button"
              style={{
                position: "relative",
                display: "inline-block",
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
              }}
              onClick={handleAvatarClick}
            >
              {uploadingAvatar ? (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f0f0f0",
                  }}
                >
                  <Spin size="small" />
                </div>
              ) : (
                <UserAvatar
                  firstName={user.firstName ?? undefined}
                  lastName={user.lastName ?? undefined}
                  showName={false}
                  pictureFileId={pictureFileId}
                  size={64}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#1677ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  border: "2px solid #fff",
                }}
              >
                <CameraOutlined />
              </div>
            </button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(",")}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </Col>
        <Col flex={1}>
          <Title level={4} style={{ margin: 0 }}>
            {user.firstName} {user.lastName}
          </Title>
          <Text type="secondary">{user.email}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {user.branch?.name || "No Branch"}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<LockOutlined />} onClick={() => setIsPasswordModalOpen(true)}>
              Change Password
            </Button>
            {!isEditing ? (
              <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <Space>
                <Button icon={<CloseOutlined />} onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => form.submit()}
                  loading={saving}
                >
                  Save Changes
                </Button>
              </Space>
            )}
          </Space>
        </Col>
      </Row>

      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={!isEditing}
        id="userSelfUpdateForm"
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[
                { required: true, message: "Please enter first name" },
                { min: 2, message: "First name must be at least 2 characters" },
              ]}
            >
              <Input placeholder="Enter first name" id="profile-firstName" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[
                { required: true, message: "Please enter last name" },
                { min: 2, message: "Last name must be at least 2 characters" },
              ]}
            >
              <Input placeholder="Enter last name" id="profile-lastName" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Email">
          <Input value={user.email} disabled />
        </Form.Item>

        <Form.Item label="Team">
          <Input value={authMe?.team?.name ?? "Unassigned"} disabled />
        </Form.Item>

        <Form.Item label="Branch">
          <Input value={user.branch?.name || "No Branch"} disabled />
        </Form.Item>
      </Form>

      {isEditing && (
        <Alert
          title="Profile Update"
          description="You can only update your first name and last name. For email, role, or branch changes, contact your administrator."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      <ChangePasswordModal
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </Card>
  );
};

export default UserSelfUpdate;
