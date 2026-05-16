# Loads UI Redesign — Two-Panel Layout with Map & HeroUI Cards

## Context

The current loads experience is a dense AntD-era data table at `/loads`, with full-page wizards for create/edit and a route-nested status modal. The branch (`feat/heroui-rewrite`) is migrating the dashboard to HeroUI v3. The user supplied a mockup of a modern "tracking-style" UI: a left rail of rich load **cards** (route visualization + customer row + status chip), and a right pane that's a **map** with an overlay detail card (tabs: Load info / Tracking / Docs). Map functionality is a placeholder for now — the focus is the redesign of layout, card content, detail panel, and create/edit drawer.

User decisions captured in this session:
- **Map**: `react-leaflet` over OpenStreetMap tiles (free, no API key).
- **Create / Edit**: HeroUI `Drawer` over the right panel; existing routes `/loads/create` and `/loads/:loadId/edit` keep working.
- **Status tabs**: keep status names as-is for v1 — tabs are `All | Pending | Approved | Delivered`, with Hold/Declined under "All". (We can rename "Approved → In-transit" later without code changes.)
- **Responsive**: Desktop ≥1024px shows both panels; <1024px collapses to a single full-width list and the right-pane detail becomes a `Drawer`.

## Target UX

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Sidebar │  ┌──────────────────────┐  ┌─────────────────────────────────┐│
│         │  │ Tracking loads       │  │ ┌──────────────────────────┐    ││
│         │  │ [🔍 Search]          │  │ │ No: #3568129  📋 ✎ 🗑 ✕  │    ││
│         │  │ [All 56][In..8][Del] │  │ │ [Load info][Tracking][Docs]    ││
│         │  │ ──────────────────── │  │ │ ● Pick up                │    ││
│         │  │ ┌──────────────────┐ │  │ │   123 Main St, Dallas    │  M ││
│         │  │ │ 📦 #41239110  🏷 │ │  │ │ ● On the way            │  A ││
│         │  │ │ ●───🚚────○      │ │  │ │   789 Central Ave        │  P ││
│         │  │ │ 362 Cast → 789…  │ │  │ │ ● Delivered             │    ││
│         │  │ │ 👤 D. Martinez  ✉☎│ │  │ └──────────────────────────┘    ││
│         │  │ └──────────────────┘ │  │   (route polyline drawn over map)││
│         │  │ ┌──────────────────┐ │  │                                 ││
│         │  │ │ 📦 #3568129 🏷 ✓│ │  │                                 ││
│         │  │ └──────────────────┘ │  │                                 ││
│         │  │  …                   │  │                                 ││
│         │  │ [＋ Add load]        │  │                                 ││
│         │  └──────────────────────┘  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Routes

| Route | Behavior |
|---|---|
| `/loads` | Two-panel: list left + map right; no detail open |
| `/loads/:loadId` | List + map + detail card overlay |
| `/loads/create` | List + map + **Drawer** in create mode |
| `/loads/:loadId/edit` | List + map + detail card + **Drawer** in edit mode |
| `/loads/:loadId/status` | List + map + detail card + status `Modal` (kept) |

Selecting a card pushes `/loads/:loadId` (preserves search/filter via `useSearchParams`). Close detail returns to `/loads`. Bookmarkable.

### Layout dimensions

- Desktop (`≥1024px`): left = `w-[420px]` fixed, right = `flex-1` map.
- Tablet/mobile (`<1024px`): left = `w-full`, right = hidden. Card tap opens a right-side `Drawer` overlay (no map).
- `AppLayout`'s `<main>` currently has `p-3` — the loads page will opt out using a `pageVariant="bleed"` prop on `<main>` (or render its own outer wrapper that **negates** the padding with `-m-3`).

## Implementation phases

Each phase ends in a self-contained, compilable state.

### Phase 0 — Pre-work (no code yet)
- Add `react-leaflet` + `leaflet` + `@types/leaflet` to `apps/dashboard/package.json` (`pnpm add -F @twy/dashboard react-leaflet leaflet @types/leaflet`).
- Import `leaflet/dist/leaflet.css` once in `apps/dashboard/src/app/index.tsx`.

### Phase 1 — Skeleton & route restructure
- Convert `LoadsPage.tsx` into a two-panel layout shell. Drop the current `useServerTable` + `DataTable`. Replace with a `<LoadsListPanel />` (left) and `<LoadsDetailPanel />` (right) stubs.
- Move the existing children-route wiring (`:loadId/status`) up so it renders inside `LoadsDetailPanel` instead of next to the table. Keep `StatusUpdateModal.tsx` unchanged.
- Add a `useSelectedLoadId()` hook (reads `useParams().loadId`, ignores nested `/edit` and `/status`).
- Wire up new routes (`router.tsx`):
  - `/loads` → `LoadsPage` with `Outlet` for `:loadId`, `create`, `:loadId/edit`, `:loadId/status`.
  - The list + map is always rendered by `LoadsPage`; the child outlet only mounts the detail overlay or drawer/modal.

### Phase 2 — `LoadCard` + list
Files to create under `apps/dashboard/src/features/load/components/`:
- `LoadStatusChip.tsx` — maps `LoadStatus` → `Chip` color/label.
  - `Pending → "Pending"  color="warning"`
  - `Approved → "In-transit" color="primary"`
  - `Delivered → "Delivered" color="success"`
  - `Hold → "On hold" color="default"`
  - `Declined → "Declined" color="danger"`
- `LoadRouteVisualization.tsx` — the dot–line–truck–line–dot SVG/CSS bar based on `load.status` (Pending=truck at start, Approved=mid, Delivered=end).
- `LoadCustomerRow.tsx` — broker avatar (placeholder initials), broker name + "Customer" label, `Button isIconOnly` for email + phone (`tel:`/`mailto:` links).
- `LoadCard.tsx` — the full card body. Composes the three above + truck icon + reference number.

Then build:
- `LoadsListPanel.tsx`:
  - HeroUI `Input` with search icon (debounced via `useDebouncedValue`).
  - HeroUI `Tabs` for status filter (`Tabs.List`, `Tabs.Tab` per status; `id="all"` first). Tab selection writes to `?status=` in URL.
  - HeroUI `ListBox aria-label="Loads" selectionMode="single"` whose items render `<LoadCard />`. Selecting an item calls `navigate(load.id)`.
  - Wrap the list in `ScrollShadow` for the fade-on-scroll affordance.
  - Sticky bottom: full-width `Button color="default"` "＋ Add load" → `navigate("create")`.
- `loadApi.ts` already supports `query`, `filters`, `page`, `limit`. Reuse `useApiQuery(["loads", { query, status, page }], ...)`. Use cursor-style infinite scroll **only if** the existing list is short enough that pagination isn't needed; otherwise keep `page=0,limit=50` for v1 and add infinite scroll in a follow-up.
- Tab counts: surface `total` per filter via three small parallel queries (`useApiQueries`) — one for each chip. Acceptable cost: <1s extra on initial load; can be optimized later with a dedicated `GET /api/loads/counts` endpoint (out of scope).

### Phase 3 — `LoadsDetailPanel` + Map
- `LoadsDetailPanel.tsx`:
  - When no `:loadId` selected → render only the map (centered on US, zoom 4) — no overlay.
  - When `:loadId` is set → run `useApiQuery(["load", loadId], () => loadApi.getById(loadId))`. While loading, show a centered `Spinner`. On success, render `<LoadDetailOverlayCard />` absolutely-positioned over the map.
- `LoadDetailOverlayCard.tsx`:
  - Top row: `No: #<referenceNumber>` + action `Button isIconOnly` for **copy** (clipboard write of referenceNumber + toast), **edit** (`navigate("edit")`), **delete** (opens `ConfirmDialog`), **close** (`navigate("/loads")`).
  - Permission-gated via existing `usePermission("loads", action)` for edit/delete.
  - HeroUI `Tabs` with three panels: `Load info`, `Tracking`, `Docs`.
    - **Load info**: read-only field list — broker, carrier, customer rate, carrier rate, branch, commodity, weight, temperature, status (`<LoadStatusChip>`), created/updated timestamps. Plus a "Change status" `Button` that calls `navigate("status")` (status change reuses existing `StatusUpdateModal`).
    - **Tracking**: vertical timeline. Pickups → "On the way" → Dropoffs. Each row: colored dot + bold label + address + optional timestamp. Uses `load.pickups` and `load.dropoffs` (current data). Status drives which dots are filled vs outline.
    - **Docs**: render `<FileList files={load.files} />` (already exists at `apps/dashboard/src/features/files/components/FileList.tsx`).
- `LoadMap.tsx`:
  - `MapContainer` from `react-leaflet`. Default center+zoom of US.
  - When a load is selected: fit bounds to its pickups + dropoffs (use `useMap()` ref + `map.fitBounds(...)`).
  - For now, addresses → coords is **out of scope**. Instead, geocode is a TODO and we plot using **placeholder coordinates** (random offsets around the US center, deterministic from `loadId`) so the map visibly responds to selection. A `// TODO(twy): geocode pickup/dropoff addresses via …` comment marks the integration point.
  - Markers: `pickup` (blue), `dropoff` (yellow), truck (black, only when status = Approved). `Polyline` dashed connecting pickup → dropoff.

### Phase 4 — `LoadFormDrawer` (Create / Edit)
- `LoadFormDrawer.tsx`:
  - HeroUI `Drawer` with `Drawer.Content placement="right"`, controlled via `useOverlayState()` opened by route presence (`create` or `:loadId/edit` child route).
  - Width: `w-[560px]` on desktop, full width on mobile.
  - Reuses the existing 5-step wizard logic from `CreateLoadPage.tsx` / `LoadEditPage.tsx` but rendered inside `Drawer.Body` with a sticky `Drawer.Footer` containing `Back / Next / Submit`.
  - Mode determined by `useMatch("create")` vs `useMatch(":loadId/edit")`.
- Delete the old `CreateLoadPage.tsx` and `LoadEditPage.tsx` page files after migrating the form. The route entries become `element: <LoadFormDrawer mode="…"/>` (still child routes of `/loads`, so the list+map stays mounted).
- On submit success: existing `queryClient.invalidateQueries({ queryKey: ["loads"] })` + (for edit) `["load", loadId]` — both already in place.
- Cancellation closes the drawer with `navigate("..")` (returns to `/loads/:loadId` for edit, `/loads` for create).

### Phase 5 — Responsive
- The two-panel shell uses Tailwind `lg:` breakpoint (`lg = 1024px`):
  - `flex-col lg:flex-row`
  - Left panel: `w-full lg:w-[420px] lg:border-r`
  - Right panel: `hidden lg:block lg:flex-1`
- On `<lg`, when a card is selected, `LoadsDetailPanel` is **rendered inside a `Drawer`** (HeroUI `Drawer` from the right) instead of inline. Same `LoadDetailOverlayCard` body, different shell.
- `LoadFormDrawer` is already a Drawer at every breakpoint, just `w-full` below `lg`.

### Phase 6 — Polish & verification
- Empty states: no loads found → centered illustration + CTA "Add your first load".
- Loading skeletons: list shows 5 skeleton cards (`bg-default-100 animate-pulse`); detail shows `Spinner`.
- Keyboard: HeroUI `ListBox` already handles arrow keys + Enter to select; verify `Drawer` traps focus and Esc closes.
- Add a `key="loads-redesign"` marker comment in `LoadsPage.tsx` so future searches find the entry point.

## Files to touch

### New files (under `apps/dashboard/src/features/load/`)
- `components/LoadCard.tsx`
- `components/LoadStatusChip.tsx`
- `components/LoadRouteVisualization.tsx`
- `components/LoadCustomerRow.tsx`
- `components/LoadsListPanel.tsx`
- `components/LoadsDetailPanel.tsx`
- `components/LoadDetailOverlayCard.tsx`
- `components/LoadDetailLoadInfoTab.tsx`
- `components/LoadDetailTrackingTab.tsx`
- `components/LoadDetailDocsTab.tsx`
- `components/LoadMap.tsx`
- `components/LoadFormDrawer.tsx`
- `hooks/useSelectedLoadId.ts`
- `hooks/useLoadStatusFilter.ts`

### Modified
- `apps/dashboard/src/features/load/pages/LoadsPage.tsx` — becomes the two-panel shell.
- `apps/dashboard/src/routes/router.tsx` — restructure load child routes (`create`, `:loadId`, `:loadId/edit`, `:loadId/status`).
- `apps/dashboard/src/layouts/AppLayout.tsx` — add a `pageVariant="bleed"` prop or per-route padding opt-out.
- `apps/dashboard/src/app/index.tsx` — `import "leaflet/dist/leaflet.css"`.
- `apps/dashboard/package.json` — add `react-leaflet`, `leaflet`, `@types/leaflet`.

### Deleted
- `apps/dashboard/src/features/load/pages/CreateLoadPage.tsx` (logic moved into `LoadFormDrawer`).
- `apps/dashboard/src/features/load/pages/LoadEditPage.tsx` (same).
- `apps/dashboard/src/features/load/components/useLoadColumns.tsx` (no table any more).

### Kept unchanged
- `apps/dashboard/src/features/load/api/loadApi.ts`
- `apps/dashboard/src/features/load/types/load.ts`
- `apps/dashboard/src/features/load/utils/statusMachine.ts`
- `apps/dashboard/src/features/load/components/StatusUpdateModal.tsx`
- `apps/dashboard/src/features/load/components/LoadStopsFormList.tsx` (consumed by the new `LoadFormDrawer`).

## Reuse map (don't reinvent)

| Need | Reuse |
|---|---|
| Form fields (`Controller` + HeroUI) | `apps/dashboard/src/components/form/FormField.tsx` (`FormTextField`, `FormNumberInput`, `FormCheckbox`, `FormTextArea`) |
| Broker picker | `apps/dashboard/src/features/outside-broker/components/BrokerAutocomplete.tsx` |
| Carrier picker | `apps/dashboard/src/features/carrier/components/CarrierAutocomplete.tsx` |
| File upload + commit | `apps/dashboard/src/features/files/` (`FileUploader`, `FileList`) |
| Query hooks | `apps/dashboard/src/libs/query.ts` (`useApiQuery`, `useApiMutation`) |
| Zod form helper | `apps/dashboard/src/libs/form.ts` (`useZodForm`) |
| Confirm dialog (delete) | Existing `ConfirmDialog` wrapper around HeroUI `AlertDialog` |
| Debounce | `apps/dashboard/src/hooks/useDebouncedValue.ts` |
| Tabs URL state pattern | `apps/dashboard/src/features/accounting/pages/PaymentOrdersPage.tsx` |
| HeroUI v3 compound APIs | `Drawer.{Backdrop,Content,Dialog,Header,Heading,Body,Footer,CloseTrigger}` / `Tabs.{ListContainer,List,Tab,Indicator,Panel}` / `ListBox.{Item,ItemIndicator}` |

## Verification (end-to-end)

1. **Local sanity**: `pnpm --filter @twy/dashboard dev` and open `http://localhost:5173/loads`.
   - Two-panel layout renders. List on left shows existing loads as cards. Map on right with no overlay.
2. **Selection**: click a card → URL becomes `/loads/<id>`, detail overlay appears with three tabs. Map fits bounds (placeholder coords).
3. **Tabs**: switch between Load info / Tracking / Docs — all render. Docs lists `load.files`.
4. **Create**: click "Add load" → drawer slides in from right. Step through wizard. Submit → toast, drawer closes, new load appears in list.
5. **Edit**: from detail overlay, click pencil → drawer opens prefilled. Save → drawer closes, detail refreshes.
6. **Status change**: from detail overlay, "Change status" → existing `StatusUpdateModal` opens. Submit → list + detail refresh.
7. **Delete**: trash icon → `ConfirmDialog` → success toast → list refreshes, detail closes (`navigate("/loads")`).
8. **Responsive**: shrink window to <1024px → map disappears, list goes full-width, clicking a card opens detail as a `Drawer`.
9. **Verification gate**:
   ```bash
   pnpm check:ci
   pnpm build
   pnpm test
   ```
   All three must pass. No new deprecation warnings.

## Out of scope (follow-ups)

- Real geocoding of pickup/dropoff addresses → map coords. Will need a geocoder (Mapbox / Google / Nominatim) and a small server-side cache. Track as a follow-up issue.
- Map tile provider with brand styling (current OSM tiles are functional but generic).
- Server-side filter counts endpoint (`GET /api/loads/counts`) to replace the 3 parallel queries.
- Inline status change in detail panel (replacing the modal) — only after geocoding lands.
- Infinite scroll on the list panel — current pagination keeps the page light.
