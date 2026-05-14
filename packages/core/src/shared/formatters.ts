export function formatUserName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const parts = [firstName, lastName].filter((p): p is string => Boolean(p?.trim()));
  if (parts.length > 0) return parts.join(" ");
  return email ?? null;
}

export function roundTo(value: number | null | string, decimals = 2): number {
  if (value === null) return 0;
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
}
