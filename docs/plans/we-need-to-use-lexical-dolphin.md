# Plan — Wire team membership into both User and Team UIs

## Context

The schema already models team membership: `users.teamId uuid references team.id ON DELETE SET NULL` (one team per user). The seed migration (`0002_silly_chamber.sql`) created the system "TWY" team and the permissions matrix. But the membership is invisible to the application:

- `packages/core/src/user/repository.ts → listUsers / getFullUserInfoById` do **not** join `team`, so the UI never sees `teamName`.
- `createUser / updateUser` (handlers and repo) **ignore** `teamId` even though the column exists.
- The teams table shows `memberCount` and blocks delete when `> 0` ("Remove all members before deleting") — but offers **no UI to remove members**.
- The user table's `useUserColumns.tsx` already renders a `Team` column wired to `record.teamName` — it just always shows "Unassigned".

User asks for: (a) assign team from the user create/edit modal, (b) manage members from inside the team drawer (create + edit), (c) show each user's team in the user list.

Decision (confirmed): keep single-team-per-user (no migration). Member picker shows only unassigned users to avoid silent reassignment. Member management happens inside the existing `TeamFormDrawer`.

## Files to modify (with anchors)

### Backend — user side (expose `teamId`/`teamName`)

1. `packages/core/src/user/request.ts` — add `teamId: z.string().uuid().nullable().optional()` to `CreateUserEventSchema` and `UpdateUserEventSchema` bodies.
2. `packages/core/src/user/response.ts` — add `teamId: string | null` and `teamName: string | null` to `UserResponse` and `UserListItemResponse`.
3. `packages/core/src/user/repository.ts`:
   - `createUser(input)` — include `teamId` in the insert.
   - `updateUser(userId, { branchId, isActive, teamId })` — include `teamId` in the `set(...)` (only when provided; allow `null` to clear).
   - `listUsers(input)` — `LEFT JOIN team ON users.teamId = team.id`, select `teamId`, `team.name AS teamName`. Allow sort by `team.name`.
   - `getFullUserInfoById(userId)` — same LEFT JOIN, return team fields.
4. `packages/functions/src/api/user/create.ts` — pass `teamId` through to `createUser`. Optional: pre-validate the team exists (else 400).
5. `packages/functions/src/api/user/update.ts` — pass `teamId` through to `updateUser`.

No new routes; no migration.

### Backend — team-members endpoints

6. `packages/core/src/team/request.ts` — add three Zod schemas:
   - `ListTeamMembersEventSchema` — pathParams `{ teamId }`, query `{ page, pageSize, q? }`.
   - `AddTeamMemberEventSchema` — pathParams `{ teamId }`, body `{ userId }`.
   - `RemoveTeamMemberEventSchema` — pathParams `{ teamId, userId }`.
   - `ListUnassignedUsersEventSchema` — query `{ q?, page?, pageSize? }` for the picker.
7. `packages/core/src/team/response.ts` — add `TeamMemberResponse = { id, email, firstName, lastName, isActive }` and `TeamMemberListResponse = { items, total }`.
8. `packages/core/src/team/repository.ts` — add four operations (mirror style of `listTeams`):
   - `listTeamMembers(teamId, { page, pageSize, q? })` — `select … from users where users.teamId = $teamId` + search by name/email + count.
   - `listUnassignedUsers({ q, page, pageSize })` — `where users.teamId IS NULL`.
   - `addMemberToTeam(teamId, userId)` — `update users set teamId = $teamId where id = $userId`. Return 409 (via `http-errors`) if user is already in **another** team to avoid silent reassignment; allow re-add to same team as no-op.
   - `removeMemberFromTeam(teamId, userId)` — `update users set teamId = NULL where id = $userId and teamId = $teamId`. 404 if not in this team.
9. New handlers under `packages/functions/src/api/team/members/`:
   - `list.ts` → `GET  /api/teams/{teamId}/members`        — gate `teams:view` (or `users:view`).
   - `add.ts`  → `POST /api/teams/{teamId}/members`        — gate `teams:edit`.
   - `remove.ts` → `DELETE /api/teams/{teamId}/members/{userId}` — gate `teams:edit`.
   - `unassigned.ts` → `GET /api/teams/unassigned-users`   — gate `teams:edit`. (Used by the picker; placed under `team/` to keep wiring local.)
10. `infra/routes.ts` — register the four new routes alongside the existing team routes (`requiresAuth: true`, `linkKeys: ["cluster"]`).

### Frontend — user-side team selector

11. New `apps/dashboard/src/features/team/components/TeamSelect.tsx` — paginated AntD `Select` with debounced search calling `getTeams`; mirror the `BranchSelect` pattern already used in `UserCreateModal`/`UserEditModal` (infinite scroll on `onPopupScroll`). Exports `<TeamSelect value onChange allowClear />`.
12. `apps/dashboard/src/features/user/types/user.ts` — add `teamId?: string | null` to `UserFormData` and `UpdateUserRequest`. (`User` interface already has `teamId`/`teamName`.)
13. `apps/dashboard/src/features/user/components/UserCreateModal.tsx` — add `<TeamSelect>` form item below Branch.
14. `apps/dashboard/src/features/user/components/UserEditModal.tsx` — add `<TeamSelect>` field with current value pre-filled; remove the stale "role" copy in the alert.
15. `apps/dashboard/src/features/user/components/useUserColumns.tsx` — already renders `record.teamName` → no change once backend returns it. Confirm "Unassigned" tag rendering still reads correctly.

### Frontend — team-side member management (inside the existing drawer)

16. `apps/dashboard/src/features/team/api/teamApi.ts` — add `getTeamMembers(teamId, params)`, `addTeamMember(teamId, userId)`, `removeTeamMember(teamId, userId)`, `getUnassignedUsers(params)`.
17. `apps/dashboard/src/features/team/types/team.ts` — add `TeamMember`, `TeamMemberListResponse`.
18. New `apps/dashboard/src/features/team/components/TeamMembersSection.tsx` — a section rendered inside `TeamFormDrawer`:
    - **Edit mode**: AntD table of current members (name, email, status, "Remove" action with `Popconfirm`), plus an "Add member" button that opens a small inline `<Select>` populated by `getUnassignedUsers` (debounced search). Add/remove call the new endpoints and refresh the list.
    - **Create mode**: hidden (a team must exist before it can have members).
19. `apps/dashboard/src/features/team/components/TeamFormDrawer.tsx` — render `<TeamMembersSection teamId={editingTeam?.id} />` after the `PermissionMatrixField` when `editingTeam` is set. Increase drawer width if cramped.
20. `apps/dashboard/src/features/team/components/useTeamColumns.tsx` — update the disabled-delete tooltip copy to point at the drawer (e.g. "Open the team to remove members first"); no other change. The "Manage members" entry point is just opening the team for edit — no new action button needed.

## Reuse / patterns to follow

- **Paginated select with debounce + infinite scroll**: copy from `apps/dashboard/src/features/user/components/UserCreateModal.tsx` Branch field (uses `useRequest` from `ahooks` + `onPopupScroll`).
- **Custom modal provider**: `TeamModalProvider` already exposes `openTeamEdit` — that's the entry point for member management. No new provider methods needed.
- **Permission gating in handlers**: `assertPermission(ctx, "teams", "edit")` after `loadAuthContext(userId)` — same pattern used in `team/update.ts`.
- **Operation-style queries**: keep `eq` / `and` / `inArray` inside `core/src/team/repository.ts`; handlers only call the operations. Per `packages/db/CLAUDE.md`.
- **Conventional Commits**: scope is required. Likely commits: `feat(core): expose teamId on user contracts and queries`, `feat(functions): team members endpoints`, `feat(ui): assign team in user form`, `feat(ui): manage team members in team drawer`.

## Critical files (read these before editing)

- `packages/core/src/user/repository.ts` — to mirror its select shape and sort handling.
- `packages/core/src/team/repository.ts` — `listTeams` is the closest pattern for `listTeamMembers`.
- `packages/functions/src/api/team/update.ts` — the auth/permission gate template for the new member handlers.
- `apps/dashboard/src/features/user/components/UserCreateModal.tsx` — the BranchSelect pattern to clone for `TeamSelect`.
- `apps/dashboard/src/features/team/components/TeamFormDrawer.tsx` — where the members section gets injected.
- `infra/routes.ts` — lines 188–212 (teams block) for new route placement.

## Edge cases to handle

- Removing a user from a team must NOT delete the user — only nulls `teamId`.
- The system "TWY" team (`TWY_TEAM_ID`) — keep its members manageable, but the team itself remains undeletable (already enforced).
- `addMemberToTeam`: if the candidate user already has a non-null `teamId` that differs from the target, return 409. The picker only shows unassigned users so this is a defensive guard.
- `users.teamId` ON DELETE SET NULL means deleting a team auto-clears membership; nothing extra to do, but `deleteTeam` already blocks delete when `memberCount > 0`, so this branch is unreachable in practice.
- Validate `teamId` exists when set on `createUser`/`updateUser` — Postgres FK will reject otherwise; surface as 400, not 500.

## Verification

1. `pnpm --filter @twy/core build && pnpm --filter @twy/functions build && pnpm --filter @twy/dashboard build` — type-clean.
2. `/verify` — `biome ci`, `turbo build`, `turbo test`. Must pass.
3. Local manual test against `pnpm sst dev --stage <username>`:
   - **User side**: open Create User → assign a team → save → user appears in users table with team tag. Edit the user → change team → save → tag updates. Edit again → clear team → tag shows "Unassigned".
   - **Team side**: open a team's edit drawer → members section lists current members → click "Add member" → picker shows only unassigned users → add → table refreshes. Remove a member → confirm → row disappears, member is unassigned (visible in users table).
   - **Permissions**: a user lacking `teams:edit` sees the members table read-only (no Add/Remove buttons).
   - **Cross-checks**: deleting a team while it has members is still blocked (Popconfirm disabled with updated tooltip). System "TWY" team is still undeletable but its members can be managed.
4. `code-reviewer` subagent on the diff — address blockers/majors.
5. `/ship` — guided commit (multiple Conventional Commits, scope required).

No DB migration. No new infra primitives. The only risk surface is the new routes + handler permission gates — covered by the verification step.
