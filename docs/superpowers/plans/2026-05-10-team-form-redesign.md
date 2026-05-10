# Team Form Drawer Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernise `TeamFormDrawer` and `TeamMembersSection` with contained-card sections, switch+description scope rows, a sticky footer, and a header subtitle — zero changes to form logic, API calls, or permission cascade behaviour.

**Architecture:** Two files change. `TeamFormDrawer.tsx` gains two local sub-components (`SectionCard`, `ScopeRow`) and is restructured around them. `TeamMembersSection.tsx` loses its bare `<Space>` header and gains card styling so it integrates visually with the rest of the drawer. No new files, no new exports.

**Tech Stack:** React 19, Ant Design 6, TypeScript (strict), Biome linter

---

## File map

| File | Change |
|---|---|
| `apps/dashboard/src/features/team/components/TeamFormDrawer.tsx` | Add `SectionCard` + `ScopeRow` local components, restructure layout, sticky footer, header subtitle |
| `apps/dashboard/src/features/team/components/TeamMembersSection.tsx` | Replace `<Space>` header with card-style header row; add card border to wrapper |

---

### Task 1: Restructure `TeamFormDrawer.tsx`

**Files:**
- Modify: `apps/dashboard/src/features/team/components/TeamFormDrawer.tsx`

- [ ] **Step 1: Replace the entire file with the new implementation**

Open `apps/dashboard/src/features/team/components/TeamFormDrawer.tsx` and replace its full contents with:

```tsx
import { Button, Drawer, Form, Input, Switch, message } from "antd";
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
```

- [ ] **Step 2: Run the TypeScript build to verify no type errors**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit 2>&1 | head -40
```

Expected: no errors referencing `TeamFormDrawer.tsx`. Fix any that appear before continuing.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/features/team/components/TeamFormDrawer.tsx
git commit -m "feat(team): restructure TeamFormDrawer with section cards and sticky footer"
```

---

### Task 2: Restyle `TeamMembersSection.tsx`

`TeamMembersSection` is only ever rendered inside `TeamFormDrawer`. We add a 12px top margin (spacing between the `<Form>` and this section), card border, and replace the bare `<Space>` header with a styled row that matches the `SectionCard` title style. The member count badge and Add button stay inline in that header row.

**Files:**
- Modify: `apps/dashboard/src/features/team/components/TeamMembersSection.tsx`

- [ ] **Step 1: Replace the return statement**

The `return` starts at line 172. Replace everything from `return (` to the end of the file with:

```tsx
  return (
    <div
      style={{
        marginTop: 12,
        background: "#0d1117",
        border: "1px solid #30363d",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              color: "#8b949e",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Members
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#8b949e",
              background: "#21262d",
              border: "1px solid #30363d",
              borderRadius: 10,
              padding: "1px 7px",
            }}
          >
            {total}
          </span>
        </div>
        {!showPicker && (
          <Button size="small" icon={<PlusOutlined />} onClick={handleOpenPicker}>
            Add member
          </Button>
        )}
      </div>

      {showPicker && (
        <Space style={{ marginBottom: 12, width: "100%" }}>
          <Select
            style={{ width: 300 }}
            placeholder="Search unassigned users"
            showSearch={{ filterOption: false, onSearch: handleUnassignedSearch }}
            onPopupScroll={handleUnassignedScroll}
            loading={loadingUnassigned}
            notFoundContent={loadingUnassigned ? <Spin size="small" /> : "No unassigned users"}
            value={selectedUserId}
            onChange={setSelectedUserId}
            options={unassigned.map((u) => ({
              value: u.id,
              label: `${u.firstName ?? ""} ${u.lastName ?? ""}`,
              email: u.email,
            }))}
            optionRender={(option) => (
              <>
                {option.label}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {option.data.email}
                </Text>
              </>
            )}
            popupRender={(menu) => (
              <>
                {menu}
                {loadingUnassigned && hasMoreUnassigned && (
                  <div style={{ textAlign: "center" }}>
                    <Spin size="small" /> Loading...
                  </div>
                )}
              </>
            )}
          />
          <Button type="primary" size="small" loading={adding} disabled={!selectedUserId} onClick={handleAdd}>
            Add
          </Button>
          <Button size="small" onClick={() => setShowPicker(false)}>
            Cancel
          </Button>
        </Space>
      )}

      <Table<TeamMember>
        columns={columns}
        dataSource={members}
        rowKey="id"
        loading={loadingMembers}
        size="small"
        pagination={{
          current: page + 1,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (p) => {
            setPage(p - 1);
            fetchMembers(p - 1);
          },
        }}
      />
    </div>
  );
};

export default TeamMembersSection;
```

- [ ] **Step 2: Run TypeScript build**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit 2>&1 | head -40
```

Expected: no errors. Fix any before continuing.

- [ ] **Step 4: Run Biome lint**

```bash
pnpm --filter @twy/dashboard exec biome ci src/features/team/ 2>&1
```

Expected: no errors. Common fix: if Biome complains about the `<Table>` column arrow functions, extract them to `useCallback` or move column definitions outside the component.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/features/team/components/TeamMembersSection.tsx
git commit -m "feat(team): restyle TeamMembersSection as section card"
```

---

### Task 3: Full verification

- [ ] **Step 1: Run the full verification suite**

```bash
pnpm check:ci && pnpm --filter @twy/dashboard build
```

Expected: `biome ci` exits 0, `tsc` exits 0, Vite build succeeds.

- [ ] **Step 2: Start dev server and open the Teams page**

```bash
pnpm run:dashboard
```

Open `http://localhost:5173` (or whatever port Vite prints), navigate to the Teams page.

- [ ] **Step 3: Verify Create flow**

- Click "Create Team" → drawer opens, title is "Create Team", no subtitle
- All 3 cards visible: Team Info, Scope, Permissions
- Scope shows two switch rows with label + description text
- Sticky footer shows "Cancel" + "Create" buttons always visible as you scroll
- Submit without a name → inline validation error appears in the Team Info card
- Fill in name, set scope switches, check some permissions → click "Create" → success toast, drawer closes

- [ ] **Step 4: Verify Edit flow**

- Click an existing team's edit action → drawer opens
- Title is "Edit Team", subtitle shows team name + member count
- All 4 cards visible: Team Info, Scope, Permissions, Members
- Members card shows count badge and "Add member" button in its header
- Add member → picker appears, search works, add succeeds → count badge updates
- Remove member → Popconfirm appears, confirm removes → count updates
- Edit name, change permissions → "Save Changes" → success toast

- [ ] **Step 5: Final commit if any lint fixes were needed**

If you made any additional fixes during Steps 1-4, commit them:

```bash
git add -p
git commit -m "fix(team): address lint issues in redesigned team form"
```
