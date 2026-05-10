import { Button, Drawer, Form, Input, message, Switch } from "antd";
import type React from "react";
import { useCallback, useEffect } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { emptyPermissionsMap, normalizePermissionsMap } from "@/utils/permissions";
import { createTeam, updateTeam } from "../api/teamApi";
import type { Team, TeamFormData } from "../types/team";
import PermissionMatrixField from "./PermissionMatrixField";
import TeamMembersSection from "./TeamMembersSection";

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <div
    style={{
      background: "#0d1117",
      border: "1px solid #30363d",
      borderRadius: 8,
      padding: "14px 16px",
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: "#8b949e",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 12,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

interface ScopeRowProps {
  label: string;
  description: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
}

const ScopeRow: React.FC<ScopeRowProps> = ({ label, description, value, onChange }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
    <div>
      <div style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{description}</div>
    </div>
    <Switch
      checked={value}
      onChange={(checked) => onChange?.(checked)}
      style={{ flexShrink: 0, marginLeft: 16, marginTop: 2 }}
    />
  </div>
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
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {isEdit ? "Edit Team" : "Create Team"}
          </div>
          {isEdit && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {team.name} · {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      }
      open={open}
      onClose={handleClose}
      size="large"
      destroyOnHidden
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <SectionCard title="Team Info">
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
        </SectionCard>

        <SectionCard title="Scope">
          <Form.Item name="branchRestricted" noStyle>
            <ScopeRow
              label="Branch-restricted"
              description="Members can only see loads from their assigned branch"
            />
          </Form.Item>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #21262d" }}>
            <Form.Item name="onlyOwnData" noStyle>
              <ScopeRow
                label="Own data only"
                description="Members only see records they created or are assigned to"
              />
            </Form.Item>
          </div>
        </SectionCard>

        <SectionCard title="Permissions">
          <Form.Item name="permissions" noStyle>
            <PermissionMatrixField />
          </Form.Item>
        </SectionCard>
      </Form>

      {isEdit && team && <TeamMembersSection teamId={team.id} />}
    </Drawer>
  );
};

export default TeamFormDrawer;
