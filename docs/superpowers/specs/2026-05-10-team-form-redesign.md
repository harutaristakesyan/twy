# Team Form Drawer Redesign

**Date:** 2026-05-10  
**Status:** Approved  
**Scope:** `apps/dashboard/src/features/team/`

## Goal

Modernise the Team create/edit drawer without changing any backend contracts, permission logic, or cascade behaviour. The drawer should feel like a first-class admin UI — clean card sections, clear scope descriptions, members integrated into the layout, and Save always visible.

## What is not changing

- `TeamFormDrawer` props interface (`open`, `team`, `onCancel`, `onSuccess`)
- Form field names and types (`name`, `description`, `branchRestricted`, `onlyOwnData`, `permissions`)
- `PermissionMatrixField` logic — cascade rules, row/column header checkboxes, RESOURCE_ACTIONS map, `—` for N/A
- `TeamMembersSection` logic — add/remove/search/pagination unchanged
- All API calls, Zod contracts, backend routes

## Design decisions

| Question | Decision |
|---|---|
| Overall structure | Enhanced single scroll — no wizard, no tabs |
| Section separation | Contained cards — each section in a bordered card with an uppercase label |
| Permission matrix layout | Flat resource list (current), styled inside a card |
| Scope controls | Switch on the right, label + one-line description on the left |
| Action buttons | Sticky footer via AntD Drawer `footer` prop — always visible |

## Layout (top to bottom)

### Drawer header
- Title: "Create Team" or "Edit Team"
- Subtitle (edit mode only): `{team.name} · {team.memberCount} members`

### Card 1 — Team Info
Fields: Name (required), Description (optional TextArea). No change to validation rules.

### Card 2 — Scope
Two switch rows, each with label + description text:

| Field | Label | Description |
|---|---|---|
| `branchRestricted` | Branch-restricted | Members can only see loads from their assigned branch |
| `onlyOwnData` | Own data only | Members only see records they created or are assigned to |

Switch on the right, text block on the left. Rows separated by a 1px inner border.

### Card 3 — Permissions
`PermissionMatrixField` rendered inside the card. Card header label: "Permissions". No changes to the component itself — only the card wrapper is new.

### Card 4 — Members (edit mode only)
Previously rendered below a bare `<Divider>` outside the form. Now a proper card section.
- Section label "Members" with a count badge (`{memberCount}`)
- Inline "Add member" button in the card header row
- Member rows: avatar initials, name, email, active indicator dot, remove button
- Same `TeamMembersSection` component, re-skinned to sit inside the card

### Sticky footer
AntD Drawer `footer` prop renders Save/Cancel pinned to the bottom:
- Left: nothing (or team ID in debug mode)
- Right: `Cancel` (default) + `Save Changes` / `Create` (primary)

## Component changes

### `TeamFormDrawer.tsx`
- Add `footer` prop to `<Drawer>` with Cancel + Save buttons (remove the inline `Form.Item` button row)
- Add subtitle to drawer title (edit mode)
- Wrap each logical section (`name`+`description`, scope switches, permissions) in a `<SectionCard>` wrapper
- Move `TeamMembersSection` inside the scroll body as the fourth card instead of below a `<Divider>`

### Local `SectionCard` component (inside `TeamFormDrawer.tsx`)
A thin local component — not a separate file. Props: `title: string`, `extra?: ReactNode`, `children`. Renders a bordered card with an uppercase section label and an optional right-side slot for the Members "Add" button. Only used in `TeamFormDrawer`, so no need to export it.

### Local `ScopeRow` component (inside `TeamFormDrawer.tsx`)
A single scope switch row: `label`, `description`, `checked`, `onChange`. Reused twice inside the Scope card. Keeps `Form.Item valuePropName="checked"` wiring in the parent. Also stays local — not exported.

### `TeamMembersSection.tsx`
Minor: remove the internal title/heading (the card title replaces it), expose `extra` slot content (the Add button) so `TeamFormDrawer` can pass it to `SectionCard`. Or keep the Add button inside `TeamMembersSection` and let `SectionCard` just render it as a child — simpler.

## Styling approach

Use inline `style` props consistent with the rest of the dashboard (no new CSS files, no Tailwind). Token values:
- Card border: `#30363d` (matches AntD dark token `colorBorderSecondary`)  
- Card background: slightly deeper than drawer body (`#0d1117` inside, `#161b22` drawer)  
- Section label: `fontSize: 10, color: colorTextQuaternary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'`  
- Scope description: `fontSize: 12, color: colorTextTertiary`

Use AntD `theme.useToken()` to pull semantic tokens rather than hardcoding hex where possible.

## Out of scope

- Dark/light mode token swap (already handled by AntD theme provider)
- Permission matrix grouping by category — kept flat per decision
- Member search UX changes
- Any backend changes
