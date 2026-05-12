# Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Change Password" button to the profile page that opens a modal letting the authenticated user change their own Cognito password.

**Architecture:** A new JWT-protected `POST /api/auth/change-password` Lambda handler calls Cognito's `ChangePasswordCommand` using the user's own Bearer token extracted from the Authorization header — no admin credentials needed and current-password verification is handled by Cognito. The frontend adds a `ChangePasswordModal` component wired to a button in the existing `UserSelfUpdate` card.

**Tech Stack:** `@aws-sdk/client-cognito-identity-provider` (already installed), Middy + Zod (existing handler pattern), Ant Design 6 `Modal` + `Form`, `ApiClient` (Axios singleton), Vitest 4.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `packages/functions/src/api/auth/changePassword.ts` | Lambda handler — extracts Bearer token, calls `ChangePasswordCommand` |
| Modify | `infra/routes.ts:187–193` | Wire new route into `appRoutes` |
| Modify | `apps/dashboard/src/features/user/api/userApi.ts:56` | Add `changePassword()` API call |
| Create | `apps/dashboard/src/features/user/components/ChangePasswordModal.tsx` | Modal with 3-field form, validation, submit |
| Create | `apps/dashboard/src/features/user/components/ChangePasswordModal.test.tsx` | Vitest test for confirm-password mismatch validation |
| Modify | `apps/dashboard/src/features/user/components/UserSelfUpdate.tsx` | Add state + "Change Password" button + render modal |

---

### Task 1: Backend handler

**Files:**
- Create: `packages/functions/src/api/auth/changePassword.ts`

- [ ] **Step 1: Create the handler file**

```typescript
// packages/functions/src/api/auth/changePassword.ts
import {
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";
import z from "zod";

const EventSchema = z.object({
  headers: z.object({
    authorization: z.string(),
  }),
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
  }),
});

type ChangePasswordEvent = z.infer<typeof EventSchema>;

interface ChangePasswordResponse {
  message: string;
}

const cognitoClient = new CognitoIdentityProviderClient({});

const changePasswordHandler = async (
  event: ChangePasswordEvent,
): Promise<ChangePasswordResponse> => {
  const accessToken = event.headers.authorization.replace(/^Bearer\s+/i, "");
  const { currentPassword, newPassword } = event.body;

  try {
    await cognitoClient.send(
      new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      }),
    );

    return { message: "Password changed successfully" };
  } catch (err) {
    const error = toError(err);
    if (error.name === "NotAuthorizedException") {
      throw new errors.Unauthorized("Current password is incorrect");
    }
    if (error.name === "InvalidPasswordException") {
      throw new errors.BadRequest("New password does not meet requirements");
    }
    if (error.name === "LimitExceededException") {
      throw new errors.TooManyRequests("Too many attempts, please try again later");
    }
    throw new errors.BadRequest(error.message);
  }
};

export const handler = middyfy<ChangePasswordEvent, ChangePasswordResponse>(
  changePasswordHandler,
  { eventSchema: EventSchema, mode: "parse" },
);
```

- [ ] **Step 2: Verify it type-checks**

```bash
pnpm --filter @twy/functions build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/functions/src/api/auth/changePassword.ts
git commit -m "feat(auth): add change-password Lambda handler"
```

---

### Task 2: Wire the route

**Files:**
- Modify: `infra/routes.ts` (append inside `appRoutes`, after the `auth/me` entry around line 193)

- [ ] **Step 1: Add the route entry to `appRoutes`**

In `infra/routes.ts`, find the `auth/me` block (around line 187) and add the new entry immediately after it:

```typescript
  // auth/change-password — authenticated user changes own password
  {
    handler: "packages/functions/src/api/auth/changePassword.handler",
    routeKey: "POST /api/auth/change-password",
    requiresAuth: true,
    linkKeys: [],
  },
```

- [ ] **Step 2: Verify infra still type-checks**

```bash
pnpm --filter @twy/functions build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add infra/routes.ts
git commit -m "feat(infra): wire POST /api/auth/change-password route"
```

---

### Task 3: Frontend API function

**Files:**
- Modify: `apps/dashboard/src/features/user/api/userApi.ts`

- [ ] **Step 1: Add the `changePassword` function**

Append to the bottom of `apps/dashboard/src/features/user/api/userApi.ts`:

```typescript
// Change own password
export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  const response = await ApiClient.post<ApiResponse<{ message: string }>>(
    "/auth/change-password",
    data,
  );
  return response.data;
};
```

- [ ] **Step 2: Verify dashboard builds**

```bash
pnpm --filter @twy/dashboard build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/features/user/api/userApi.ts
git commit -m "feat(user): add changePassword API function"
```

---

### Task 4: ChangePasswordModal component + test

**Files:**
- Create: `apps/dashboard/src/features/user/components/ChangePasswordModal.tsx`
- Create: `apps/dashboard/src/features/user/components/ChangePasswordModal.test.tsx`

- [ ] **Step 1: Write the failing test first**

Create `apps/dashboard/src/features/user/components/ChangePasswordModal.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChangePasswordModal from "./ChangePasswordModal";

describe("ChangePasswordModal", () => {
  it("shows validation error when confirm password does not match new password", async () => {
    render(<ChangePasswordModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Current Password"), "OldPass1!");
    await userEvent.type(screen.getByLabelText("New Password"), "NewPass1!");
    await userEvent.type(screen.getByLabelText("Confirm New Password"), "WrongPass!");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm --filter @twy/dashboard exec vitest run src/features/user/components/ChangePasswordModal.test.tsx
```

Expected: FAIL — `ChangePasswordModal` module not found.

- [ ] **Step 3: Implement the modal**

Create `apps/dashboard/src/features/user/components/ChangePasswordModal.tsx`:

```typescript
import { Button, Form, Input, Modal, message } from "antd";
import type React from "react";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { changePassword } from "../api/userApi";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordModal: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      setSaving(true);
      try {
        await changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        message.success("Password changed successfully");
        handleClose();
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [handleClose],
  );

  return (
    <Modal
      title="Change Password"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: "Please enter your current password" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[{ required: true, message: "Please enter a new password" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Please confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={handleClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @twy/dashboard exec vitest run src/features/user/components/ChangePasswordModal.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/features/user/components/ChangePasswordModal.tsx apps/dashboard/src/features/user/components/ChangePasswordModal.test.tsx
git commit -m "feat(user): add ChangePasswordModal component with validation"
```

---

### Task 5: Wire the modal into the profile card

**Files:**
- Modify: `apps/dashboard/src/features/user/components/UserSelfUpdate.tsx`

- [ ] **Step 1: Add import, state, button, and modal render**

At the top of `UserSelfUpdate.tsx`, add the import after the existing imports:

```typescript
import { LockOutlined } from "@ant-design/icons";
import ChangePasswordModal from "./ChangePasswordModal";
```

Add state after the existing `isEditing` state (around line 29):

```typescript
const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
```

In the top-right `<Col>` (around line 79), add the "Change Password" button. The full Col should look like:

```tsx
<Col>
  <Space>
    <Button
      icon={<LockOutlined />}
      onClick={() => setIsPasswordModalOpen(true)}
    >
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
```

Add the modal render just before the closing `</Card>` tag (around line 160):

```tsx
<ChangePasswordModal
  open={isPasswordModalOpen}
  onClose={() => setIsPasswordModalOpen(false)}
/>
```

- [ ] **Step 2: Verify dashboard builds with no type errors**

```bash
pnpm --filter @twy/dashboard build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/features/user/components/UserSelfUpdate.tsx
git commit -m "feat(user): add Change Password button to profile card"
```

---

### Task 6: Full verification

- [ ] **Step 1: Run the full verification gate**

```bash
pnpm check:ci && pnpm build && pnpm test
```

Expected: all three exit 0 with no errors or warnings introduced by this feature.

- [ ] **Step 2: If any Biome lint errors appear, fix them**

Common issues in `apps/dashboard/**`:
- Missing `useCallback` around a function used in a `useEffect` dep array → wrap with `useCallback`
- `!` non-null assertion → use optional chaining or early return

Re-run `pnpm check:ci` after any fix until clean.

- [ ] **Step 3: Final commit if any lint fixes were needed**

```bash
git add -p
git commit -m "fix(user): address biome lint warnings in change-password feature"
```
