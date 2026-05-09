import { Checkbox, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useCallback } from "react";
import {
  ACTIONS,
  type Action,
  type PermissionsMap,
  RESOURCES,
  type Resource,
} from "@/utils/permissions";

const ACTION_LABELS: Record<Action, string> = {
  add: "Add",
  view: "View",
  edit: "Edit",
};

const RESOURCE_LABELS: Record<Resource, string> = {
  branches: "Branches",
  brokers: "Outside Brokers",
  brokers_requests: "Brokers — Requests",
  carriers_twy: "Carriers — Twy",
  carriers_outside: "Carriers — Outside",
  carriers_requests: "Carriers — Requests",
  teams: "Teams",
  users: "Users",
  loads: "Loads",
  payment_orders: "Accounting — Payment Orders",
  external_billing: "Accounting — External Billing",
  internal_billing: "Accounting — Internal Billing",
};

interface MatrixRow {
  resource: Resource;
}

interface PermissionMatrixFieldProps {
  value?: PermissionsMap;
  onChange?: (value: PermissionsMap) => void;
}

// edit → requires add + view; add → requires view.
// Cascade: checking a permission enables its prerequisites; unchecking disables dependents.
function cascade(
  action: Action,
  checked: boolean,
  row: Record<Action, boolean>,
): Record<Action, boolean> {
  const r = { ...row, [action]: checked };
  if (checked) {
    if (action === "edit") {
      r.add = true;
      r.view = true;
    }
    if (action === "add") {
      r.view = true;
    }
  } else {
    if (action === "view") {
      r.edit = false;
      r.add = false;
    }
    if (action === "add") {
      r.edit = false;
    }
  }
  return r;
}

const PermissionMatrixField: React.FC<PermissionMatrixFieldProps> = ({ value, onChange }) => {
  const handleChange = useCallback(
    (resource: Resource, action: Action, checked: boolean) => {
      if (!value || !onChange) return;
      onChange({
        ...value,
        [resource]: cascade(
          action,
          checked,
          value[resource] ?? { add: false, view: false, edit: false },
        ),
      });
    },
    [value, onChange],
  );

  const handleRowToggle = useCallback(
    (resource: Resource, checked: boolean) => {
      if (!value || !onChange) return;
      onChange({
        ...value,
        [resource]: Object.fromEntries(ACTIONS.map((a) => [a, checked])) as Record<Action, boolean>,
      });
    },
    [value, onChange],
  );

  const handleColumnToggle = useCallback(
    (action: Action, checked: boolean) => {
      if (!value || !onChange) return;
      const updated = { ...value };
      for (const resource of RESOURCES) {
        updated[resource] = cascade(
          action,
          checked,
          updated[resource] ?? { add: false, view: false, edit: false },
        );
      }
      onChange(updated);
    },
    [value, onChange],
  );

  const columns: ColumnsType<MatrixRow> = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: 140,
      render: (resource: Resource) => {
        const allChecked = value ? ACTIONS.every((a) => value[resource]?.[a]) : false;
        const someChecked = value ? ACTIONS.some((a) => value[resource]?.[a]) : false;
        return (
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            onChange={(e) => handleRowToggle(resource, e.target.checked)}
          >
            <Tag color="blue" style={{ marginLeft: 4 }}>
              {RESOURCE_LABELS[resource]}
            </Tag>
          </Checkbox>
        );
      },
    },
    ...ACTIONS.map((action) => ({
      title: () => {
        const allChecked = value ? RESOURCES.every((r) => value[r]?.[action]) : false;
        const someChecked = value ? RESOURCES.some((r) => value[r]?.[action]) : false;
        return (
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            onChange={(e) => handleColumnToggle(action, e.target.checked)}
          >
            {ACTION_LABELS[action]}
          </Checkbox>
        );
      },
      dataIndex: action,
      key: action,
      width: 90,
      render: (_: unknown, row: MatrixRow) => (
        <Checkbox
          checked={value?.[row.resource]?.[action] ?? false}
          onChange={(e) => handleChange(row.resource, action, e.target.checked)}
        />
      ),
    })),
  ];

  const dataSource: MatrixRow[] = RESOURCES.map((resource) => ({ resource }));

  return (
    <Table<MatrixRow>
      columns={columns}
      dataSource={dataSource}
      rowKey="resource"
      pagination={false}
      size="small"
      bordered
    />
  );
};

export default PermissionMatrixField;
