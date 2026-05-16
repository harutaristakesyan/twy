import { House, Person } from "@gravity-ui/icons";
import { cn, Switch } from "@heroui/react";
import type React from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

interface ScopeOptionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
}

const ScopeOption: React.FC<ScopeOptionProps> = ({
  icon: Icon,
  title,
  description,
  isSelected,
  onChange,
}) => (
  <div
    className={cn(
      "flex items-start gap-3 rounded-xl border bg-content1 px-4 py-3 transition-colors",
      isSelected ? "border-primary/50 bg-primary/5" : "border-default-200",
    )}
  >
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
        isSelected ? "bg-primary/15 text-primary" : "bg-default-100 text-default-500",
      )}
    >
      <Icon className="size-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-default-800">{title}</p>
      <p className="text-xs text-default-500">{description}</p>
    </div>
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      aria-label={title}
      className="mt-0.5 shrink-0"
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  </div>
);

interface TeamScopeFieldsProps<T extends FieldValues> {
  control: Control<T>;
  branchRestrictedField: Path<T>;
  onlyOwnDataField: Path<T>;
}

const TeamScopeFields = <T extends FieldValues>({
  control,
  branchRestrictedField,
  onlyOwnDataField,
}: TeamScopeFieldsProps<T>) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Controller
      name={branchRestrictedField}
      control={control}
      render={({ field }) => (
        <ScopeOption
          icon={House}
          title="Branch-restricted"
          description="Members only see records inside their assigned branch."
          isSelected={!!field.value}
          onChange={field.onChange}
        />
      )}
    />
    <Controller
      name={onlyOwnDataField}
      control={control}
      render={({ field }) => (
        <ScopeOption
          icon={Person}
          title="Own data only"
          description="Members only see records they created or are assigned to."
          isSelected={!!field.value}
          onChange={field.onChange}
        />
      )}
    />
  </div>
);

export default TeamScopeFields;
