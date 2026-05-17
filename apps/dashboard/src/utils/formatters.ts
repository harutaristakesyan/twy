export const formatDate = (date?: Date | null): string => {
  if (!date) return "--";
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatCurrency = (
  amount: number | string | null | undefined,
  decimals = 2,
): string => {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatChangePercent = (percent: number): string => {
  const sign = percent >= 0 ? "" : "-";
  return `${sign}${Math.abs(percent).toFixed(2)}%`;
};

export const formatChangeAmount = (amount: number): string => {
  const sign = amount >= 0 ? "+" : "-";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${sign}${formatted}`;
};

export const renderCurrency = (v: number | string | null | undefined): string => formatCurrency(v);

export const formatPercent = (v: number | null | undefined): string =>
  v != null ? `${v.toFixed(2)}%` : "—";

export const renderDate = (v: string | null | undefined): string =>
  v
    ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

export const toDate = (s: string): Date => new Date(s);

export const diffDays = (future: Date, base: Date) =>
  Math.max(0, Math.ceil((future.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)));

export const formatCompact = (n: number): string =>
  Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);

export const formatDistanceKm = (meters: number): string => {
  const km = meters / 1000;
  if (km >= 100) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
};

export const formatDurationHm = (seconds: number): string => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};
