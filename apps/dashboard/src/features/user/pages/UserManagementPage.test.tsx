import { render, screen } from "@testing-library/react";
import type React from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import UserManagementPage from "./UserManagementPage";

vi.mock("@/hooks/useCurrentUser");
vi.mock("@/features/user/components/UserManagementTable", () => ({
  default: () => <div>UserManagementTable</div>,
}));
vi.mock("@/features/team/components/TeamManagementTable", () => ({
  default: () => <div>TeamManagementTable</div>,
}));
vi.mock("@/features/user/providers/UserModalProvider", () => ({
  UserModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/team/providers/TeamModalProvider", () => ({
  TeamModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const makePermissions = (usersView: boolean, teamsView: boolean) => ({
  users: { view: usersView, edit: false, add: false },
  teams: { view: teamsView, edit: false, add: false },
  branches: { view: false, edit: false, add: false },
  loads: { view: false, edit: false, add: false },
  brokers: { view: false, edit: false, add: false },
  brokers_requests: { view: false, edit: false, add: false },
  carriers_twy: { view: false, edit: false, add: false },
  carriers_outside: { view: false, edit: false, add: false },
  carriers_requests: { view: false, edit: false, add: false },
});

const renderPage = (usersView: boolean, teamsView: boolean) => {
  vi.mocked(useCurrentUser).mockReturnValue({
    permissions: makePermissions(usersView, teamsView),
    authMe: null,
    loading: false,
  } as unknown as ReturnType<typeof useCurrentUser>);
  return render(
    <MemoryRouter>
      <UserManagementPage />
    </MemoryRouter>,
  );
};

describe("UserManagementPage", () => {
  it("shows Users and Teams tabs when both permissions are granted", () => {
    renderPage(true, true);
    expect(screen.getByRole("tab", { name: "Users" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Teams" })).toBeDefined();
  });

  it("renders UserManagementTable directly without tabs when only users.view", () => {
    renderPage(true, false);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("UserManagementTable")).toBeDefined();
  });

  it("renders TeamManagementTable directly without tabs when only teams.view", () => {
    renderPage(false, true);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("TeamManagementTable")).toBeDefined();
  });

  it("renders nothing when user has neither permission", () => {
    const { container } = renderPage(false, false);
    expect(container.firstChild).toBeNull();
  });
});
