import { ArrowRotateRight, EllipsisVertical, Eye, Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Description, Dropdown, Header, Label, Separator } from "@heroui/react";
import { type ComponentType, Fragment } from "react";

/**
 * Single source of truth for action presets — adding a new action type means
 * adding one entry here and exposing it in `ActionType`.
 */
const ACTION_PRESETS = {
  edit: { label: "Edit", icon: Pencil, danger: false },
  delete: { label: "Delete", icon: TrashBin, danger: true },
  view: { label: "View", icon: Eye, danger: false },
  status: { label: "Update Status", icon: ArrowRotateRight, danger: false },
  remove: { label: "Remove", icon: TrashBin, danger: true },
} as const satisfies Record<
  string,
  { label: string; icon: ComponentType<{ className?: string }>; danger: boolean }
>;

export type ActionType = keyof typeof ACTION_PRESETS;

export interface ActionItem {
  /** Predefined action type — drives the icon, default label, and danger styling. */
  type: ActionType;
  /** Handler invoked when the item is selected. */
  onAction: () => void;
  /** Override the default label (e.g. "Remove from team" instead of "Remove"). */
  label?: string;
  /** Optional secondary line shown under the label. */
  description?: string;
  /** Hide the item entirely (e.g. when a permission is missing). */
  hidden?: boolean;
  /** Disable the item without removing it. */
  disabled?: boolean;
}

export interface ActionSection {
  /** Optional section heading. */
  header?: string;
  items: ActionItem[];
}

interface ActionsMenuProps {
  /** A flat array of items (single unlabelled section) or grouped sections. */
  actions: ActionItem[] | ActionSection[];
  /** Aria-label for the trigger button. */
  ariaLabel?: string;
  /** Override the trigger size (default `sm`). */
  size?: "sm" | "md" | "lg";
}

const isSectioned = (actions: ActionItem[] | ActionSection[]): actions is ActionSection[] =>
  actions.length > 0 && "items" in actions[0];

const ActionsMenu = ({ actions, ariaLabel = "Actions", size = "sm" }: ActionsMenuProps) => {
  const sections: ActionSection[] = isSectioned(actions)
    ? actions.map((s) => ({ ...s, items: s.items.filter((i) => !i.hidden) }))
    : [{ items: actions.filter((i) => !i.hidden) }];

  const visibleSections = sections.filter((s) => s.items.length > 0);
  if (visibleSections.length === 0) return null;

  const flat = visibleSections.flatMap((s) => s.items);

  const handleAction = (key: string | number) => {
    const item = flat.find((i) => i.type === key);
    item?.onAction();
  };

  return (
    <Dropdown>
      <Button isIconOnly aria-label={ariaLabel} variant="tertiary" size={size}>
        <EllipsisVertical className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleAction(key as string)}>
          {visibleSections.map((section, idx) => (
            <Fragment key={section.header ?? `section-${idx}`}>
              {idx > 0 && <Separator />}
              <Dropdown.Section>
                {section.header && <Header>{section.header}</Header>}
                {section.items.map((item) => {
                  const preset = ACTION_PRESETS[item.type];
                  const Icon = preset.icon;
                  const label = item.label ?? preset.label;
                  return (
                    <Dropdown.Item
                      key={item.type}
                      id={item.type}
                      textValue={label}
                      variant={preset.danger ? "danger" : undefined}
                      isDisabled={item.disabled}
                    >
                      <Icon
                        className={`size-4 shrink-0 ${preset.danger ? "text-danger" : "text-muted"}`}
                      />
                      <div className="flex flex-col">
                        <Label>{label}</Label>
                        {item.description && <Description>{item.description}</Description>}
                      </div>
                    </Dropdown.Item>
                  );
                })}
              </Dropdown.Section>
            </Fragment>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

export default ActionsMenu;
