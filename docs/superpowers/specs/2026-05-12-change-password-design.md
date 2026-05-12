# Change Password Feature — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

## Overview

Allow authenticated users to change their own password from the Profile page. A "Change Password" button on the profile card opens a modal with three fields (current password, new password, confirm password). The backend uses Cognito's `ChangePasswordCommand` with the user's own Access Token, so Cognito validates the current password and enforces password policy atomically.

## Backend

**New file:** `packages/functions/src/api/auth/changePassword.ts`

- Route: `POST /api/auth/change-password`
- Wired in `infra/routes.ts` under `authRoutes` (JWT-protected), `linkKeys: []` (no AWS resources needed — `ChangePasswordCommand` uses only the user's own access token)
- Zod schema: `{ body: { currentPassword: string, newPassword: string } }`
- Handler extracts the raw Cognito Access Token from `event.headers.authorization` (strips `Bearer ` prefix)
- Calls `ChangePasswordCommand({ AccessToken, PreviousPassword, ProposedPassword })`
- Cognito validates the current password and enforces the pool's password policy

**Error mapping:**

| Cognito exception | http-errors | Message |
|---|---|---|
| `NotAuthorizedException` | 401 | "Current password is incorrect" |
| `InvalidPasswordException` | 400 | "New password does not meet requirements" |
| `LimitExceededException` | 429 | (default) |

## Frontend

**New file:** `apps/dashboard/src/features/user/components/ChangePasswordModal.tsx`

- Props: `open: boolean`, `onClose: () => void`
- Self-contained: owns its own `Form` instance and `saving` state
- Three fields: Current Password, New Password, Confirm New Password
- Client-side validation: confirm field must match new password
- On submit: calls `changePassword()` from `userApi.ts` → success closes modal + resets form + `message.success`; error shows `message.error` via `getErrorMessage`

**Updated file:** `apps/dashboard/src/features/user/api/userApi.ts`

- Add `changePassword({ currentPassword, newPassword })` — POST to `/api/auth/change-password`

**Updated file:** `apps/dashboard/src/features/user/components/UserSelfUpdate.tsx`

- Add `isPasswordModalOpen` boolean state
- Add "Change Password" button in the top-right of the card (next to "Edit Profile")
- Render `<ChangePasswordModal open={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />`

## Data Flow

```
User clicks "Change Password"
  → isPasswordModalOpen = true
  → Modal renders
User fills form → submits
  → POST /api/auth/change-password { currentPassword, newPassword }
  → Backend extracts Bearer token from Authorization header
  → Cognito ChangePasswordCommand(AccessToken, PreviousPassword, ProposedPassword)
  → Success: 200 { message: "Password changed successfully" }
  → Frontend: message.success, modal closes, form resets
  → Error: 401/400/429 → message.error with API error message
```

## Out of Scope

- Password strength indicator (Cognito error messages are sufficient)
- Force re-login after password change (Cognito does not invalidate existing tokens on password change via this API)
- Admin-initiated password reset (separate flow via `AdminSetUserPasswordCommand`)
