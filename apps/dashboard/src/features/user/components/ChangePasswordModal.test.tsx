import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./ChangePasswordModal";

vi.mock("../api/userApi", () => ({
  changePassword: vi.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderForm = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ChangePasswordForm onClose={vi.fn()} />
    </QueryClientProvider>,
  );

describe("ChangePasswordModal", () => {
  it("shows validation error when confirm password does not match new password", async () => {
    renderForm();

    // Three password inputs appear in order: currentPassword, newPassword, confirmPassword
    const inputs = document.querySelectorAll('input[type="password"]');
    const [currentPw, newPw, confirmPw] = Array.from(inputs);

    await userEvent.type(currentPw, "OldPass1!");
    await userEvent.type(newPw, "NewPass1!");
    await userEvent.type(confirmPw, "WrongPass!");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });
});
