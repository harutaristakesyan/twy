import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTIONS,
  type Action,
  type PermissionsMap,
  RESOURCE_ACTIONS,
  RESOURCES,
  type Resource,
} from "@/utils/permissions";

const ACTION_LABELS: Record<Action, string> = {
  add: "Add",
  view: "View",
  edit: "Edit",
  delete: "Delete",
};

const RESOURCE_LABELS: Record<Resource, string> = {
  branches: "Branches",
  settings: "Settings",
  brokers: "Outside Brokers",
  brokers_requests: "Brokers — Requests",
  carriers_twy: "Carriers — Twy",
  carriers_outside: "Carriers — Outside",
  carriers_requests: "Carriers — Requests",
  teams: "Teams",
  users: "Users",
  loads: "Loads",
  load_payment_order: "Accounting — Load Payment Orders",
  office_expense_payment_order: "Accounting — Office Expense POs",
  external_billing: "Accounting — External Billing",
  internal_billing: "Accounting — Internal Billing",
};

const TRANSITION_MAP: Partial<Record<Resource, string[]>> = {
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

// cascade: checking enables prerequisites; unchecking disables dependents.
function cascade(
  action: Action,
  checked: boolean,
  row: Record<Action, boolean>,
): Record<Action, boolean> {
  const r = { ...row, [action]: checked };
  if (checked) {
    if (action === "delete") {
      r.edit = true;
      r.add = true;
      r.view = true;
    }
    if (action === "edit") {
      r.add = true;
      r.view = true;
    }
    if (action === "add") {
      r.view = true;
    }
  } else {
    if (action === "view") {
      r.add = false;
      r.edit = false;
      r.delete = false;
    }
    if (action === "add") {
      r.edit = false;
      r.delete = false;
    }
    if (action === "edit") {
      r.delete = false;
    }
  }
  return r;
}

const EMPTY_ROW: Record<Action, boolean> = { add: false, view: false, edit: false, delete: false };

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  disabled,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600 disabled:cursor-not-allowed"
    />
  );
};

interface PermissionMatrixFieldProps {
  value?: PermissionsMap;
  onChange?: (value: PermissionsMap) => void;
}

const PermissionMatrixField: React.FC<PermissionMatrixFieldProps> = ({ value, onChange }) => {
  const [expandedRows, setExpandedRows] = useState<Set<Resource>>(new Set());

  const handleChange = useCallback(
    (resource: Resource, action: Action, checked: boolean) => {
      if (!value || !onChange) return;
      onChange({
        ...value,
        [resource]: cascade(action, checked, value[resource] ?? { ...EMPTY_ROW }),
      });
    },
    [value, onChange],
  );

  const handleRowToggle = useCallback(
    (resource: Resource, checked: boolean) => {
      if (!value || !onChange) return;
      const validActions = RESOURCE_ACTIONS[resource];
      const current = value[resource] ?? { ...EMPTY_ROW };
      const updated = validActions.reduce((acc, a) => cascade(a, checked, acc), {
        ...current,
      } as Record<Action, boolean>);
      onChange({ ...value, [resource]: updated });
    },
    [value, onChange],
  );

  const handleColumnToggle = useCallback(
    (action: Action, checked: boolean) => {
      if (!value || !onChange) return;
      const updated = { ...value };
      for (const resource of RESOURCES) {
        if (!RESOURCE_ACTIONS[resource].includes(action)) continue;
        updated[resource] = cascade(action, checked, updated[resource] ?? { ...EMPTY_ROW });
      }
      onChange(updated);
    },
    [value, onChange],
  );

  const toggleExpand = (resource: Resource) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 w-52">
              Resource
            </th>
            {ACTIONS.map((action) => {
              const applicableResources = RESOURCES.filter((r) =>
                RESOURCE_ACTIONS[r].includes(action),
              );
              const allChecked = value
                ? applicableResources.every((r) => value[r]?.[action])
                : false;
              const someChecked = value
                ? applicableResources.some((r) => value[r]?.[action])
                : false;
              return (
                <th
                  key={action}
                  className="border-b border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 w-20"
                >
                  <div className="flex flex-col items-center gap-1">
                    <IndeterminateCheckbox
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={(checked) => handleColumnToggle(action, checked)}
                    />
                    <span>{ACTION_LABELS[action]}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((resource, idx) => {
            const validActions = RESOURCE_ACTIONS[resource];
            const allChecked = value ? validActions.every((a) => value[resource]?.[a]) : false;
            const someChecked = value ? validActions.some((a) => value[resource]?.[a]) : false;
            const hasTransitions = Boolean(TRANSITION_MAP[resource]);
            const isExpanded = expandedRows.has(resource);
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/50";

            return [
              <tr key={resource} className={rowBg}>
                <td className="border-b border-r border-gray-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {hasTransitions && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(resource)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    )}
                    <IndeterminateCheckbox
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={(checked) => handleRowToggle(resource, checked)}
                    />
                    <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {RESOURCE_LABELS[resource]}
                    </span>
                  </div>
                </td>
                {ACTIONS.map((action) => {
                  const allowed = validActions.includes(action);
                  return (
                    <td
                      key={action}
                      className="border-b border-r border-gray-200 px-3 py-2 text-center"
                    >
                      {allowed ? (
                        <IndeterminateCheckbox
                          checked={value?.[resource]?.[action] ?? false}
                          onChange={(checked) => handleChange(resource, action, checked)}
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>,
              ...(isExpanded && hasTransitions
                ? [
                    <tr key={`${resource}-transitions`} className={rowBg}>
                      <td
                        colSpan={ACTIONS.length + 1}
                        className="border-b border-gray-200 bg-blue-50/30 px-6 py-3"
                      >
                        <p className="mb-2 text-xs font-semibold text-gray-600">
                          Status Transitions
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {(TRANSITION_MAP[resource] ?? []).map((status) => {
                            const key = `transition:${status}`;
                            const resourcePerms = value?.[resource] as
                              | Record<string, boolean>
                              | undefined;
                            const isChecked = Boolean(resourcePerms?.[key]);
                            return (
                              <label
                                key={key}
                                className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (!value || !onChange) return;
                                    onChange({
                                      ...value,
                                      [resource]: {
                                        ...value[resource],
                                        [key]: e.target.checked,
                                      } as PermissionsMap[Resource],
                                    });
                                  }}
                                  className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-blue-600"
                                />
                                {status}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>,
                  ]
                : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionMatrixField;
