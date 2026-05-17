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

export function formatDistanceKm(meters: number): string {
  const km = meters / 1000;
  if (km >= 100) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatDurationHm(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
