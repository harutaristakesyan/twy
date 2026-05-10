import { Button, Divider, Drawer, Flex, Form, Input, message, Switch, Typography } from "antd";
import type React from "react";
import { useCallback, useEffect } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { emptyPermissionsMap, normalizePermissionsMap } from "@/utils/permissions";
import { createTeam, updateTeam } from "../api/teamApi";
import type { Team, TeamFormData } from "../types/team";
import PermissionMatrixField from "./PermissionMatrixField";
import TeamMembersSection from "./TeamMembersSection";

const { Text } = Typography;

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <>
    <Divider titlePlacement="start" plain style={{ marginTop: 0 }}>
      <Text
        type="secondary"
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </Text>
    </Divider>
    {children}
  </>
);

interface ScopeRowProps {
  label: string;
  description: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
}

const ScopeRow: React.FC<ScopeRowProps> = ({ label, description, value, onChange }) => (
  <Flex justify="space-between" align="flex-start">
    <Flex vertical gap={2}>
      <Text style={{ fontSize: 13, fontWeight: 500 }}>{label}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {description}
      </Text>
    </Flex>
    <Switch
      checked={value}
      onChange={(checked) => onChange?.(checked)}
      style={{ marginLeft: 16, marginTop: 2 }}
    />
  </Flex>
);

interface TeamFormDrawerProps {
  open: boolean;
  team?: Team;
  onCancel: () => void;
  onSuccess: () => void;
}

const TeamFormDrawer: React.FC<TeamFormDrawerProps> = ({ open, team, onCancel, onSuccess }) => {
  const [form] = Form.useForm<TeamFormData>();
  const isEdit = !!team;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (team) {
      form.setFieldsValue({
        name: team.name,
        description: team.description ?? undefined,
        branchRestricted: team.branchRestricted,
        onlyOwnData: team.onlyOwnData,
        permissions: normalizePermissionsMap(team.permissions),
      });
    }
  }, [open, team, form]);

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
        permissions: normalizePermissionsMap(team.permissions),
      }
    : {
        branchRestricted: false,
        onlyOwnData: false,
        permissions: emptyPermissionsMap(),
      };

  return (
    <Drawer
      title={
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 16 }}>
            {isEdit ? "Edit Team" : "Create Team"}
          </Text>
          {isEdit && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {team.name} · {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
            </Text>
          )}
        </Flex>
      }
      open={open}
      onClose={handleClose}
      size="large"
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap="small">
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleFinish}>
        <Section title="Team Info">
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Name is required" },
              { max: 100, message: "Name must be at most 100 characters" },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Team name" />
          </Form.Item>
          <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
            <Input.TextArea placeholder="Description" rows={2} />
          </Form.Item>
        </Section>

        <Section title="Scope">
          <Form.Item name="branchRestricted" noStyle>
            <ScopeRow
              label="Branch-restricted"
              description="Members can only see loads from their assigned branch"
            />
          </Form.Item>
          <Divider style={{ margin: "10px 0" }} />
          <Form.Item name="onlyOwnData" noStyle>
            <ScopeRow
              label="Own data only"
              description="Members only see records they created or are assigned to"
            />
          </Form.Item>
        </Section>

        <Section title="Permissions">
          <Form.Item name="permissions" noStyle>
            <PermissionMatrixField />
          </Form.Item>
        </Section>
      </Form>

      {isEdit && team && <TeamMembersSection teamId={team.id} />}
    </Drawer>
  );
};

export default TeamFormDrawer;
