export function roundTo(value: number | null | string, decimals = 2): number {
  if (value === null) return 0;
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
}
