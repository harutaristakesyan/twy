export function roundTo(value: number | null | string, decimals = 2): number {
  if (value === null) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
