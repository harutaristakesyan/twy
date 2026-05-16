import { ArrowRightFromSquare, Person } from "@gravity-ui/icons";
import { Avatar, Button, Dropdown, Label } from "@heroui/react";
import type { Key } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/providers/AuthProvider";

const UserDropdown = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const handleAction = (key: Key) => {
    if (key === "profile") navigate("/profile");
    else if (key === "logout") logout();
  };

  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((n) => n?.[0]?.toUpperCase())
      .join("") || "?";

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return (
    <Dropdown>
      <Button variant="ghost" className="flex w-full items-center justify-start gap-2 px-2 py-1.5">
        <Avatar size="sm">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
        <div className="flex min-w-0 flex-col text-left">
          <p className="truncate text-sm font-medium leading-5">{fullName || "—"}</p>
          <p className="truncate text-xs leading-none text-muted">{user?.email}</p>
        </div>
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={handleAction}>
          <Dropdown.Item id="profile" textValue="My Profile">
            <div className="flex w-full items-center justify-between gap-2">
              <Label>My Profile</Label>
              <Person className="size-3.5 text-muted" />
            </div>
          </Dropdown.Item>
          <Dropdown.Item id="logout" textValue="Log Out" variant="danger">
            <div className="flex w-full items-center justify-between gap-2">
              <Label>Log Out</Label>
              <ArrowRightFromSquare className="size-3.5 text-danger" />
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

export default UserDropdown;
