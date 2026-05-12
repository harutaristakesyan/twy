import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChangePasswordModal from "./ChangePasswordModal";

vi.mock("../api/userApi", () => ({
  changePassword: vi.fn(),
}));

describe("ChangePasswordModal", () => {
  it("shows validation error when confirm password does not match new password", async () => {
    render(<ChangePasswordModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Current Password"), "OldPass1!");
    await userEvent.type(screen.getByLabelText("New Password"), "NewPass1!");
    await userEvent.type(screen.getByLabelText("Confirm New Password"), "WrongPass!");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });
});
