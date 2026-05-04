export const deriveInsuranceStatus = (expiry: string | null): { color: string; label: string } => {
  if (!expiry) return { color: "warning", label: "Pending" };
  return new Date(expiry) >= new Date()
    ? { color: "success", label: "Active" }
    : { color: "error", label: "Expired" };
};
