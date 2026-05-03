import { Button, Divider, Drawer, Form, Input, message, Space, Switch, Typography } from "antd";
import type React from "react";
import { useCallback } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { emptyPermissionsMap } from "@/utils/permissions";
import { createTeam, updateTeam } from "../api/teamApi";
import type { Team, TeamFormData } from "../types/team";
import PermissionMatrixField from "./PermissionMatrixField";
import TeamMembersSection from "./TeamMembersSection";

const { Title } = Typography;

interface TeamFormDrawerProps {
  open: boolean;
  team?: Team;
  onCancel: () => void;
  onSuccess: () => void;
}

const TeamFormDrawer: React.FC<TeamFormDrawerProps> = ({ open, team, onCancel, onSuccess }) => {
  const [form] = Form.useForm<TeamFormData>();
  const isEdit = !!team;

  const handleClose = useCallback(() => {
    form.resetFields();
    onCancel();
  }, [form, onCancel]);

  const handleFinish = useCallback(
    async (values: TeamFormData) => {
      try {
        if (isEdit) {
          await updateTeam(team.id, values);
          message.success("Team updated successfully");
        } else {
          await createTeam(values);
          message.success("Team created successfully");
        }
        form.resetFields();
        onSuccess();
      } catch (error) {
        message.error(getErrorMessage(error));
      }
    },
    [isEdit, team, form, onSuccess],
  );

  const initialValues: Partial<TeamFormData> = team
    ? {
        name: team.name,
        description: team.description ?? undefined,
        branchRestricted: team.branchRestricted,
        onlyOwnData: team.onlyOwnData,
        permissions: team.permissions,
      }
    : {
        branchRestricted: false,
        onlyOwnData: false,
        permissions: emptyPermissionsMap(),
      };

  return (
    <Drawer
      title={
        <Title level={5} style={{ margin: 0 }}>
          {isEdit ? "Edit Team" : "Create Team"}
        </Title>
      }
      open={open}
      onClose={handleClose}
      width={800}
      destroyOnHidden
      footer={null}
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleFinish}>
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, message: "Name is required" },
            { max: 100, message: "Name must be at most 100 characters" },
          ]}
        >
          <Input placeholder="Team name" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Optional description" rows={2} />
        </Form.Item>

        <Form.Item label="Scope">
          <Form.Item
            name="branchRestricted"
            valuePropName="checked"
            noStyle={false}
            style={{ marginBottom: 8 }}
          >
            <Switch checkedChildren="Branch-restricted" unCheckedChildren="All branches" />
          </Form.Item>
          <div style={{ marginTop: 8 }}>
            <Form.Item name="onlyOwnData" valuePropName="checked" noStyle={false}>
              <Switch checkedChildren="Own data only" unCheckedChildren="All data" />
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item name="permissions" label="Permissions">
          <PermissionMatrixField />
        </Form.Item>

        <Form.Item>
          <Space style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {isEdit ? "Save" : "Create"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      {isEdit && team && (
        <>
          <Divider />
          <TeamMembersSection teamId={team.id} />
        </>
      )}
    </Drawer>
  );
};

export default TeamFormDrawer;
