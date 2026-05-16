import { ComboBox, Input, type Key, Label, ListBox } from "@heroui/react";
import type React from "react";
import { useEffect, useState } from "react";
import { getUnassignedUsers } from "@/features/team/api/teamApi";
import { useApiQuery } from "@/libs/query";
import { getUsers } from "../api/userApi";

export type UserSelectSource = "all" | "unassigned";

interface UserSelectProps {
  value?: string | null;
  onChange?: (id: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  initialOption?: { value: string; label: string };
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
  /** Which user list to search. "all" = every user, "unassigned" = users not on any team. */
  source?: UserSelectSource;
}

interface UserItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

const fullName = (u: UserItem): string =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;

const UserSelect: React.FC<UserSelectProps> = ({
  value,
  onChange,
  label = "User",
  placeholder = "Search users…",
  disabled,
  initialOption,
  variant,
  isInvalid,
  source = "all",
}) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useApiQuery<UserItem[]>([`users-select-${source}`, debounced], async () => {
    if (source === "unassigned") {
      const res = await getUnassignedUsers({ page: 0, limit: 30, query: debounced || undefined });
      return res.items;
    }
    const res = await getUsers({ page: 0, limit: 30, query: debounced || undefined });
    return res.users;
  });

  const fetched: UserItem[] = data ?? [];
  const items: UserItem[] =
    initialOption && !fetched.find((u) => u.id === initialOption.value)
      ? [
          { id: initialOption.value, firstName: initialOption.label, lastName: "", email: "" },
          ...fetched,
        ]
      : fetched;

  return (
    <ComboBox
      allowsEmptyCollection
      isDisabled={disabled}
      isInvalid={isInvalid}
      value={value ?? null}
      onChange={(key: Key | null) => onChange?.(key ? String(key) : null)}
      onInputChange={setSearch}
    >
      {label ? <Label>{label}</Label> : null}
      <ComboBox.InputGroup>
        <Input variant={variant} placeholder={placeholder} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {items.map((user) => {
            const name = fullName(user);
            return (
              <ListBox.Item key={user.id} id={user.id} textValue={name}>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{name}</span>
                  {user.email && user.email !== name && (
                    <span className="text-xs text-default-500">{user.email}</span>
                  )}
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            );
          })}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
};

export default UserSelect;
