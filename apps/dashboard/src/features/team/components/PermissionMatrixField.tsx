import { Eye, House, Lock, Pencil, Persons, Plus, TrashBin, Tray } from "@gravity-ui/icons";
import { Chip, cn, Label, SearchField, ToggleButton } from "@heroui/react";
import { type ComponentType, Fragment, type ReactNode, useMemo, useState } from "react";
import {
  type Action,
  type PermissionsMap,
  RESOURCE_ACTIONS,
  RESOURCES,
  type Resource,
} from "@/utils/permissions";

interface ResourceMeta {
  label: string;
  description: string;
}

const RESOURCE_META: Record<Resource, ResourceMeta> = {
  branches: { label: "Branches", description: "Top-level offices and their hierarchy" },
  teams: { label: "Teams", description: "User groups, permission sets, and members" },
  users: { label: "Users", description: "Individual user accounts and roles" },
  settings: { label: "Settings", description: "Workspace-wide configuration" },
  loads: { label: "Loads", description: "Shipment records and their lifecycle" },
  brokers: { label: "Directory", description: "External broker companies you work with" },
  brokers_requests: { label: "Requests", description: "Inbound broker onboarding requests" },
  carriers_twy: { label: "Twy Carriers", description: "Internal carrier fleet under Twy" },
  carriers_outside: { label: "Outside Carriers", description: "Third-party carrier companies" },
  carriers_requests: { label: "Requests", description: "Inbound carrier onboarding requests" },
  load_payment_order: { label: "Load POs", description: "Payment orders tied to a load" },
  office_expense_payment_order: {
    label: "Office Expense POs",
    description: "Payment orders for office expenses",
  },
  external_billing: { label: "External Billing", description: "Invoices issued to brokers" },
  internal_billing: { label: "Internal Billing", description: "Settlements with carriers" },
};

interface GroupMeta {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  resources: readonly Resource[];
  /** Tailwind classes that color this group's chrome */
  accent: { ring: string; chip: string; iconBg: string };
}

const GROUPS: readonly GroupMeta[] = [
  {
    key: "organization",
    label: "Organization",
    icon: House,
    resources: ["branches", "teams", "users", "settings"],
    accent: {
      ring: "ring-blue-500/20",
      chip: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    },
  },
  {
    key: "loads",
    label: "Loads",
    icon: Tray,
    resources: ["loads"],
    accent: {
      ring: "ring-emerald-500/20",
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    },
  },
  {
    key: "brokers",
    label: "Brokers",
    icon: Persons,
    resources: ["brokers", "brokers_requests"],
    accent: {
      ring: "ring-violet-500/20",
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    },
  },
  {
    key: "carriers",
    label: "Carriers",
    icon: Persons,
    resources: ["carriers_twy", "carriers_outside", "carriers_requests"],
    accent: {
      ring: "ring-amber-500/20",
      chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    },
  },
  {
    key: "accounting",
    label: "Accounting",
    icon: Lock,
    resources: [
      "load_payment_order",
      "office_expense_payment_order",
      "external_billing",
      "internal_billing",
    ],
    accent: {
      ring: "ring-rose-500/20",
      chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    },
  },
];

// Anything that escapes the curated groups still shows up.
const GROUPED = new Set(GROUPS.flatMap((g) => g.resources));
const UNGROUPED = RESOURCES.filter((r) => !GROUPED.has(r));
const ALL_GROUPS: readonly GroupMeta[] =
  UNGROUPED.length > 0
    ? [
        ...GROUPS,
        {
          key: "other",
          label: "Other",
          icon: Lock,
          resources: UNGROUPED,
          accent: {
            ring: "ring-default-300",
            chip: "bg-default-200 text-default-700",
            iconBg: "bg-default-200 text-default-700",
          },
        },
      ]
    : GROUPS;

const TRANSITION_MAP: Partial<Record<Resource, readonly string[]>> = {
  loads: ["Pending", "Approved", "Hold", "Declined", "Delivered"],
  load_payment_order: [
    "Pending",
    "Approved",
    "Paid",
    "PartialPaid",
    "Hold",
    "Declined",
    "ReadyForInvoice",
  ],
  office_expense_payment_order: ["Pending", "Approved", "Paid", "PartialPaid", "Hold", "Declined"],
};

const ACTION_META: Record<Action, { label: string; icon: ComponentType<{ className?: string }> }> =
  {
    view: { label: "View", icon: Eye },
    add: { label: "Add", icon: Plus },
    edit: { label: "Edit", icon: Pencil },
    delete: { label: "Delete", icon: TrashBin },
  };

const ACTION_DISPLAY_ORDER: readonly Action[] = ["view", "add", "edit", "delete"];

/** Tailwind classes for each action's "on" state. Off state is shared neutral. */
const ACTION_ON_CLASSES: Record<Action, string> = {
  view: "border-blue-500/60 bg-blue-500/15 text-blue-700 dark:text-blue-200",
  add: "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  edit: "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-200",
  delete: "border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-200",
};

const EMPTY_ROW: Record<Action, boolean> = { add: false, view: false, edit: false, delete: false };

/** Only rule: Add, Edit, or Delete requires View. Turning View off turns those off;
 *  turning any of them on turns View on. Add / Edit / Delete are independent of each other. */
function cascade(
  action: Action,
  checked: boolean,
  row: Record<Action, boolean>,
): Record<Action, boolean> {
  const r = { ...row, [action]: checked };
  if (checked) {
    if (action === "add" || action === "edit" || action === "delete") {
      r.view = true;
    }
  } else if (action === "view") {
    r.add = false;
    r.edit = false;
    r.delete = false;
  }
  return r;
}

interface ActionPillProps {
  action: Action;
  isOn: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

const ActionPill = ({ action, isOn, isDisabled, onToggle, ariaLabel }: ActionPillProps) => {
  const meta = ACTION_META[action];
  const Icon = meta.icon;

  if (isDisabled) {
    return (
      <span
        role="img"
        aria-label={`${meta.label} not applicable`}
        className="inline-flex h-7 select-none items-center gap-1.5 rounded-full border border-dashed border-default-300 px-2.5 text-xs font-medium text-default-300"
      >
        <Icon className="size-3" />
        {meta.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={isOn}
      className={cn(
        "inline-flex h-7 select-none items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        isOn
          ? ACTION_ON_CLASSES[action]
          : "border-default-200 bg-transparent text-default-500 hover:border-default-300 hover:bg-default-100 hover:text-default-700",
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </button>
  );
};

interface ResourceRowProps {
  resource: Resource;
  row: Record<Action, boolean>;
  transitions: Record<string, boolean>;
  onActionToggle: (action: Action, checked: boolean) => void;
  onTransitionToggle: (status: string, checked: boolean) => void;
}

const ResourceRow = ({
  resource,
  row,
  transitions,
  onActionToggle,
  onTransitionToggle,
}: ResourceRowProps) => {
  const validActions = RESOURCE_ACTIONS[resource];
  const meta = RESOURCE_META[resource];
  const resourceTransitions = TRANSITION_MAP[resource];

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-default-800">{meta.label}</p>
          <p className="truncate text-xs text-default-500">{meta.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ACTION_DISPLAY_ORDER.map((action) => {
            const allowed = validActions.includes(action);
            return (
              <ActionPill
                key={action}
                action={action}
                isOn={Boolean(row[action])}
                isDisabled={!allowed}
                onToggle={() => onActionToggle(action, !row[action])}
                ariaLabel={`${ACTION_META[action].label} permission for ${meta.label}`}
              />
            );
          })}
        </div>
      </div>
      {resourceTransitions ? (
        <div className="flex flex-col gap-1.5 rounded-lg bg-default-50/60 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-default-500">
            Status transitions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {resourceTransitions.map((status) => {
              const isOn = Boolean(transitions[`transition:${status}`]);
              return (
                <ToggleButton
                  key={status}
                  size="sm"
                  variant="ghost"
                  isSelected={isOn}
                  onChange={(selected) => onTransitionToggle(status, selected)}
                >
                  {status}
                </ToggleButton>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface GroupSectionProps {
  group: GroupMeta;
  visibleResources: readonly Resource[];
  value: PermissionsMap;
  onActionToggle: (resource: Resource, action: Action, checked: boolean) => void;
  onTransitionToggle: (resource: Resource, status: string, checked: boolean) => void;
}

const GroupSection = ({
  group,
  visibleResources,
  value,
  onActionToggle,
  onTransitionToggle,
}: GroupSectionProps) => {
  const Icon = group.icon;

  const { activeCount, totalCount } = useMemo(() => {
    let active = 0;
    for (const r of group.resources) {
      const validActions = RESOURCE_ACTIONS[r];
      if (validActions.some((a) => value[r]?.[a])) active += 1;
    }
    return { activeCount: active, totalCount: group.resources.length };
  }, [group.resources, value]);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-default-200 bg-content1")}>
      <div className="flex items-center gap-3 border-b border-default-200 bg-default-50/60 px-4 py-2.5">
        <span
          aria-hidden="true"
          className={cn("flex size-7 items-center justify-center rounded-lg", group.accent.iconBg)}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="text-sm font-semibold text-default-800">{group.label}</span>
        <Chip size="sm" variant="soft" className={cn("font-medium", group.accent.chip)}>
          <Chip.Label>
            {activeCount}/{totalCount}
          </Chip.Label>
        </Chip>
      </div>
      <div className="divide-y divide-default-100">
        {visibleResources.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-default-400">
            No resources match your search.
          </p>
        ) : (
          visibleResources.map((resource) => (
            <ResourceRow
              key={resource}
              resource={resource}
              row={(value[resource] ?? EMPTY_ROW) as Record<Action, boolean>}
              transitions={(value[resource] ?? {}) as Record<string, boolean>}
              onActionToggle={(action, checked) => onActionToggle(resource, action, checked)}
              onTransitionToggle={(status, checked) =>
                onTransitionToggle(resource, status, checked)
              }
            />
          ))
        )}
      </div>
    </div>
  );
};

interface PermissionMatrixFieldProps {
  value?: PermissionsMap;
  onChange?: (value: PermissionsMap) => void;
}

const PermissionMatrixField = ({ value, onChange }: PermissionMatrixFieldProps) => {
  const [query, setQuery] = useState("");

  const visiblePerGroup = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const out: Record<string, Resource[]> = {};
    for (const group of ALL_GROUPS) {
      out[group.key] = group.resources.filter((r) => {
        if (!normalized) return true;
        const meta = RESOURCE_META[r];
        return (
          meta.label.toLowerCase().includes(normalized) ||
          meta.description.toLowerCase().includes(normalized) ||
          group.label.toLowerCase().includes(normalized)
        );
      });
    }
    return out;
  }, [query]);

  const handleActionToggle = (resource: Resource, action: Action, checked: boolean) => {
    if (!value || !onChange) return;
    const row = (value[resource] ?? { ...EMPTY_ROW }) as Record<Action, boolean>;
    const cascaded = cascade(action, checked, row);
    // Preserve transitions when rewriting the row
    const existing = (value[resource] ?? {}) as Record<string, boolean>;
    const carried: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(existing)) {
      if (k.startsWith("transition:")) carried[k] = v;
    }
    onChange({
      ...value,
      [resource]: { ...cascaded, ...carried } as PermissionsMap[Resource],
    });
  };

  const handleTransitionToggle = (resource: Resource, status: string, checked: boolean) => {
    if (!value || !onChange) return;
    const key = `transition:${status}`;
    onChange({
      ...value,
      [resource]: {
        ...value[resource],
        [key]: checked,
      } as PermissionsMap[Resource],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SearchField value={query} onChange={setQuery}>
        <Label className="sr-only">Search resources</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search resources…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <div className="flex flex-col gap-3">
        {ALL_GROUPS.map((group) => {
          const visible = visiblePerGroup[group.key] ?? [];
          // Hide groups with no matches when searching
          if (query.trim() && visible.length === 0) return null;
          return (
            <GroupSection
              key={group.key}
              group={group}
              visibleResources={visible}
              value={value ?? ({} as PermissionsMap)}
              onActionToggle={handleActionToggle}
              onTransitionToggle={handleTransitionToggle}
            />
          );
        })}
      </div>

      <Legend />
    </div>
  );
};

const LEGEND_ITEMS: { action: Action; help: string }[] = [
  { action: "view", help: "Read records" },
  { action: "add", help: "Create new records" },
  { action: "edit", help: "Modify existing records" },
  { action: "delete", help: "Permanently remove records" },
];

const Legend = (): ReactNode => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed border-default-200 bg-default-50/40 px-3 py-2 text-[11px] text-default-500">
    <span className="font-semibold uppercase tracking-wider text-default-500">Legend</span>
    {LEGEND_ITEMS.map(({ action, help }) => {
      const Icon = ACTION_META[action].icon;
      return (
        <Fragment key={action}>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex size-4 items-center justify-center rounded-full border",
                ACTION_ON_CLASSES[action],
              )}
            >
              <Icon className="size-2.5" />
            </span>
            <span>
              <span className="font-medium text-default-700">{ACTION_META[action].label}</span>
              <span className="text-default-400"> — {help}</span>
            </span>
          </span>
        </Fragment>
      );
    })}
    <span className="text-default-400">Add, Edit, and Delete each require View.</span>
  </div>
);

export default PermissionMatrixField;
