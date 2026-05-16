# Dashboard rewrite: AntD → HeroUI v3 + Tailwind v4 + TanStack Query

## Context

`apps/dashboard` is a React 19 + Vite SPA today built on **Ant Design 6**, **ahooks** (`useRequest`, `useAntdTable`), **Axios** (custom `ApiClient`), and **react-router-dom 7**. The CLAUDE.md describes TanStack Query, but the code never adopted it — server state is currently ahooks. The app has grown to 11 feature domains (auth, user, branch, load, carrier, outside-broker, accounting, community-license, team, files, settings), ~22 modal usages, 107 AntD import lines, and a deeply AntD-flavored visual language.

We want a **complete rewrite** on a feature branch (no incremental cohabitation), targeting:

- **HeroUI v3.0.4** + **Tailwind CSS v4** as the entire UI layer (no AntD).
- **TanStack Query** as the single server-state primitive (no ahooks).
- **react-hook-form + Zod** as the form layer (Zod contracts already live in `packages/functions/src/contracts` — we'll consume them directly).
- **@ebay/nice-modal-react** for global modal management (replaces the seven per-domain `<Domain>ModalProvider` files).
- HeroUI's own **DatePicker / DateRangePicker** and **Upload** primitives. Charts are not used today; the `@ant-design/charts` dependency goes away.

The end state preserves every current route, permission gate, auth flow, and feature surface — only the UI layer, form layer, and data-fetching layer change. Backend (`packages/functions`, `packages/db`, infra) is untouched.

## Approach (big-bang on `feat/heroui-rewrite`)

Single long-lived branch. The dashboard is unusable on this branch until the rewrite lands; `master` stays shippable. Order of work below is build-order — each step gets the next one to compile.

### Phase 0 — Branch + scaffold

1. Create branch `feat/heroui-rewrite` off `master`.
2. In `apps/dashboard/package.json`:
   - **Remove**: `antd`, `@ant-design/icons`, `@ant-design/charts`, `ahooks`, `js-cookie` (replaced by `localStorage`-based JWT util — confirm with user; keep cookies if preferred).
   - **Add**: `@heroui/react@^3.0.4`, `@heroui/styles@^3.0.4`, `tailwindcss@^4`, `@tailwindcss/vite`, `@tanstack/react-query@^5`, `@tanstack/react-query-devtools`, `react-hook-form@^7`, `@hookform/resolvers`, `@ebay/nice-modal-react`, `@internationalized/date` (HeroUI date primitives), `lucide-react` (icon set replacing `@ant-design/icons`).
3. Tailwind v4 setup:
   - `apps/dashboard/vite.config.mts` → add `@tailwindcss/vite` plugin.
   - Create `src/styles/globals.css`:
     ```css
     @import "tailwindcss";
     @import "@heroui/styles";
     ```
   - Import it once at the top of `src/app/index.tsx`.
   - No `tailwind.config.js` (Tailwind v4 is CSS-first).
   - **Do NOT** add `heroui()` Tailwind plugin or `hero.ts` — those are v2-only.
4. Root provider tree (`src/app/App.tsx`):
   ```tsx
   <Suspense>
     <QueryClientProvider client={queryClient}>
       <Toast.Provider />          {/* HeroUI v3 */}
       <NiceModal.Provider>
         <AuthProvider>
           <RouterProvider router={router} />
         </AuthProvider>
       </NiceModal.Provider>
     </QueryClientProvider>
   </Suspense>
   ```
   No `HeroUIProvider` (removed in v3). No `ConfigProvider`. Theme via Tailwind CSS variables in `globals.css`.
5. Update Biome overrides in `biome.json` if any AntD-specific allowances exist (none currently; keep dashboard's `noNonNullAssertion: error`, `useExhaustiveDependencies: error`, `useHookAtTopLevel: error`).

### Phase 1 — Cross-cutting primitives (`src/libs`, `src/components`, `src/hooks`)

These compile first because every feature imports them.

1. **TanStack Query bootstrap** — `src/libs/queryClient.ts`:
   - `QueryClient` with `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`.
   - Keep `src/libs/ApiClient.ts` (Axios + refresh interceptor) — only the consumers change.
2. **Query/mutation helpers** — `src/libs/query.ts`:
   - Thin `apiQuery(key, fn)` and `apiMutation(fn, opts)` helpers that funnel `toError` through `toast.danger(...)` for unhandled rejections.
3. **Paginated table hook** — `src/hooks/useServerTable.ts` (replaces `useAntdTable`):
   - Inputs: `queryKey`, `fetcher({ page, pageSize, sort, filters })`, initial state.
   - Returns `{ items, total, page, pageSize, setPage, setPageSize, sort, setSort, isLoading }` driven by `useQuery({ keepPreviousData: true })`.
   - Designed to plug straight into HeroUI `<Table>` (controlled pagination).
4. **Modal registry** — `src/libs/modals.ts`:
   - Wraps `@ebay/nice-modal-react` so modal components register themselves via `NiceModal.create(...)` and any caller does `NiceModal.show(MyModal, props)` returning a promise.
   - Re-export a typed `showModal<T>(component, props): Promise<T>` to keep call sites strict.
5. **Form helpers** — `src/libs/form.ts`:
   - `useZodForm(schema, defaults)` thin wrapper around `useForm({ resolver: zodResolver(schema) })`.
   - `<FormField>` adapter that bridges `Controller` → HeroUI `Input/Select/Autocomplete/DatePicker/...` (HeroUI v3 inputs accept `value`/`onChange`/`isInvalid`/`errorMessage` cleanly).
6. **App layout** (`src/layouts/`):
   - Rebuild `AppLayout`, `AppHeader`, `Sidebar` using HeroUI `Navbar`, `Drawer` (mobile), and Tailwind grid for shell.
   - Sidebar still driven by `MenuFeature` enum + `usePermission`.
7. **Shared UI primitives** (`src/components/`):
   - `UserAvatar`, `UserDropdown`, `Logo`, `LabeledOption`, `GlobalErrorBoundary` — straight rewrites onto HeroUI `Avatar`, `Dropdown`, `Menu`.
   - `AdvancedFilter/` — rebuild as a HeroUI `Popover` containing a react-hook-form panel.
   - **Delete** `src/providers/AntdProvider.tsx`.

### Phase 2 — Auth + routing

- Keep `src/routes/router.tsx`, `ProtectedRoute.tsx`, `RequirePermission.tsx`, `RequireBrokerRequestsView.tsx` shape; replace AntD `<Spin>` with HeroUI `Spinner`, replace any `message`/`notification` call with HeroUI `toast()`.
- `AuthProvider`: same API (`useAuth()` returning `{ authMe, login, logout }`), but its internal `login`/`logout` mutations move to TanStack `useMutation`. `js-cookie` stays (cookies are per-origin and we need that for multi-domain auth, per CLAUDE.md).
- Rewrite the 6 auth pages (`LoginPage`, `ForgotPasswordPage`, `VerificationPage`, `CreatePasswordPage`, `SetPasswordPage`, `RegistrationPage`) — small, isolated, good warm-up.

### Phase 3 — Feature domains (rebuild in this order, each merges to feature branch independently)

For each feature: rewrite pages → rewrite modals (via `NiceModal.create`) → wire TanStack Query → delete the per-domain `<Domain>ModalProvider.tsx`.

Order chosen so the autocomplete components (used by branch/load) exist before consumers:

1. **user** (`UsersPage`, `TeamsPage`, `ProfilePage`, `UserCreateModal`, `UserEditModal`, `ChangePasswordModal`) — touches the most surface, validates the form+table+modal stack early. Migrate `UserManagementPage.test.tsx` and `ChangePasswordModal.test.tsx`.
2. **community-license** (`CIManagementPage`, `CICreateModal`, `CIEditModal`, `CIAutocomplete`) — rebuild `CIAutocomplete` on HeroUI `Autocomplete` with async items + `existingCI` preselect. ⚠️ Recent fix on `master` (commit `bde5040`) addressed display-value/filter bugs; carry the *intent* (decouple display label from form UUID, support `existingCI` prefill) into the new component but don't port the AntD-specific workarounds.
3. **branch** (`BranchesPage`, `BranchCreateModal`, `BranchEditModal`) — depends on `CIAutocomplete`.
4. **carrier** (`CarriersLayout`, `TwyCarriersTab`, `OutsideCarriersTab`, `CarrierRequestsTab`, `CarrierCreateModal`, `CarrierEditModal`, `CarrierAutocomplete`).
5. **outside-broker** (`OutsideBrokersLayout`, `OutsideBrokersPage`, `BrokerRequestsTab`, `OutsideBrokerCreateModal`, `OutsideBrokerEditModal`, `BrokerAutocomplete`).
6. **load** (`LoadsPage`, `CreateLoadPage`, `LoadEditModal`, `StatusUpdateModal`) — depends on Carrier + Broker + CI autocompletes. Biggest single page; budget extra time for `CreateLoadPage`'s multi-step form (react-hook-form `useFieldArray` + steps).
7. **accounting** (`AccountingLayout`, `PaymentOrdersPage`, `ExternalBillingPage`, `InternalBillingPage`, `CreateLoadPaymentOrderModal`, `CreateOfficeExpenseModal`, `UpdatePaymentStatusModal`, `OfficeExpensePaymentOrderDetailModal`). Migrate `groupLoadsByCreator.test.ts` (pure logic — should pass unchanged).
8. **team**, **settings** — lightweight, last.
9. **files** (`features/files/`) — rebuild `FileUploader`, `AttachedFilesField`, `FileList`, `FileDownloadButton` on HeroUI's `Upload` component. **Preserve** the atomic commit/cancel semantics in `useFileUpload` (that hook owns S3 presign + commit lifecycle and is the trickiest piece — keep its shape, only swap the UI shell).

### Phase 4 — Sweep

1. Grep for `from "antd"`, `from "ahooks"`, `from "@ant-design/"` — must be zero.
2. Remove `apps/dashboard/CLAUDE.md` references to AntD; update to describe HeroUI/Tailwind/TanStack/RHF/NiceModal. Update root `CLAUDE.md` UI section.
3. Delete `src/providers/AntdProvider.tsx`, all `src/features/*/providers/*ModalProvider.tsx` files.
4. Run `/verify` (biome ci + turbo build + turbo test). No deprecations allowed in the diff (CLAUDE.md gate).
5. Run `pnpm sst dev --stage <user>` and smoke-test every route + every modal + every list page's pagination/sort/filter against real backend.

## Critical files to modify or replace

**New / scaffolding**
- `apps/dashboard/vite.config.mts` (add `@tailwindcss/vite`)
- `apps/dashboard/src/styles/globals.css` (new)
- `apps/dashboard/src/app/App.tsx` (provider tree rewrite)
- `apps/dashboard/src/libs/queryClient.ts` (new)
- `apps/dashboard/src/libs/query.ts` (new)
- `apps/dashboard/src/libs/modals.ts` (new — NiceModal wrapper)
- `apps/dashboard/src/libs/form.ts` (new — RHF + Zod helpers + `<FormField>`)
- `apps/dashboard/src/hooks/useServerTable.ts` (new — replaces `useAntdTable`)

**Replaced wholesale**
- Every file under `apps/dashboard/src/features/*/components/`, `pages/`, `providers/`
- `apps/dashboard/src/layouts/*`
- `apps/dashboard/src/components/*` (UserAvatar, UserDropdown, Logo, LabeledOption, AdvancedFilter, GlobalErrorBoundary)
- `apps/dashboard/src/providers/AntdProvider.tsx` → delete
- `apps/dashboard/src/features/*/providers/*ModalProvider.tsx` → delete (replaced by NiceModal registration on each modal component)

**Preserved (logic only — call sites rewrite)**
- `apps/dashboard/src/libs/ApiClient.ts` — keep Axios singleton + refresh interceptor
- `apps/dashboard/src/utils/jwt.ts`, `permissions.ts`, `formatters.ts`, `errorUtils.ts`, `selectUtils.ts`, `timezones.ts`, `email.ts`, `getDirtyFields.ts`, `shareInFlightPromise.ts`
- `apps/dashboard/src/routes/*` (light edits only — spinner/toast swaps)
- `apps/dashboard/src/providers/AuthProvider.tsx` (internal logic preserved; `login`/`logout` move to `useMutation`)
- `apps/dashboard/src/features/*/api/*.ts` (plain async fns kept; consumers swap from `useRequest` to `useQuery`/`useMutation`)
- `apps/dashboard/src/features/files/useFileUpload.ts` and `filesApi.ts` (S3 lifecycle preserved)

**Reused utilities to leverage**
- `packages/functions/src/contracts/**` — Zod schemas reused directly in RHF `zodResolver(...)` (no duplication of request/response shapes in the UI).
- `MenuFeature` enum in `src/utils/permissions.ts` — keep as-is; drives sidebar + `<RequirePermission>`.
- `toError` from `@shared/index` server-side has a UI twin in `src/utils/errorUtils.ts` — keep using it inside `apiMutation` error handler.

## HeroUI v3 specifics worth pinning

(From context7-fetched docs for `/llmstxt/heroui_react_llms_txt`; matches v3.0.4.)

- React 19+, Tailwind v4, **no Framer Motion**, **no HeroUIProvider**.
- CSS: `@import "tailwindcss"; @import "@heroui/styles";` — no `heroui()` plugin, no `hero.ts`.
- Disclosure: `useOverlayState()` (not the old `useDisclosure`). Modal uses compound API: `<Modal isOpen onClose><Modal.Header/><Modal.Body/><Modal.Footer/></Modal>`.
- DatePicker / DateRangePicker: compound API with `DateField.Input/Segment/Suffix`, `Trigger`, `Popover`, `Calendar/RangeCalendar`. Values are `@internationalized/date` objects (not JS `Date`); convert at the form boundary.
- Toasts: render `<Toast.Provider />` once; fire `toast(...)` / `toast.success(...)` / `toast.danger(...)` globally.
- Icons: HeroUI docs use `@gravity-ui/icons` and `lucide-react`. Standardize on **lucide-react**.
- Collection items use `id` + `textValue` (was `key` + `label` in v2).
- Removed v2 hooks: `useInput`, `useSwitch`, etc. — use compound components.

## Verification

End-to-end on the feature branch before merge:

1. **Static gates**: `pnpm check:ci` (biome), `pnpm turbo run build`, `pnpm turbo run test`. Zero AntD/ahooks imports — verify with `grep -r "from \"antd\"\|from \"ahooks\"\|@ant-design" apps/dashboard/src` → empty.
2. **Auth smoke**: login, logout, refresh-token flow, password reset, registration, set-password — each on `dev.twy.am` and `dev.twy.be` (per-origin cookies must still isolate).
3. **Permission smoke**: log in as a user without a given `MenuFeature` and confirm sidebar item is hidden and the route returns the permission-denied UI.
4. **CRUD smoke for each feature**: open the page, paginate the table, sort/filter, open every Create/Edit/Status modal via `NiceModal.show`, submit, confirm TanStack Query cache invalidation refreshes the list. Specifically validate: BranchEditModal prefills CI, CIAutocomplete dropdown opens and filters server-side, LoadEditModal autocompletes for carrier/broker/CI, FileUploader's atomic commit/cancel.
5. **Manual visual pass**: dark/light mode toggle (HeroUI theme via Tailwind CSS variables) on at least 3 pages.
6. **`/ship`**: Conventional Commit with scope `ui` (e.g. `feat(ui): rewrite dashboard on HeroUI v3 + Tailwind + TanStack`), open PR, request the `code-reviewer` subagent on the diff. Expect a large PR — annotate sections in the PR description by phase.

## Out of scope / explicit non-goals

- No backend changes (`packages/functions`, `packages/db`, `infra/`, `sst.config.ts`).
- No feature changes — the rewrite must be feature-parity with `master` at branch-cut time.
- No charts (`@ant-design/charts` is being removed; no replacement needed — none are currently rendered).
- No mobile/PWA work beyond what HeroUI's responsive defaults provide.
- No i18n introduction (existing English-only strings carry over).
