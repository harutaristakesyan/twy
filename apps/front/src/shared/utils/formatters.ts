export const formatDate = (date?: Date | null): string => {
  if (!date) return '--'
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatCurrency = (amount: number | string, decimals = 2): string => {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export const formatChangePercent = (percent: number): string => {
  const sign = percent >= 0 ? '' : '-'
  return `${sign}${Math.abs(percent).toFixed(2)}%`
}

export const formatChangeAmount = (amount: number): string => {
  const sign = amount >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`
}

export const toDate = (s: string): Date => new Date(s)

export const diffDays = (future: Date, base: Date) => Math.max(0, Math.ceil((future.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)))

export const formatCompact = (n: number): string => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n)
