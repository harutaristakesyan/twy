export type TimeZoneOption = { label: string; value: string }

/** Safe browser tz detection */
export const getBrowserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Get all IANA zones (falls back to a minimal list if not supported) */
export const getAllTimeZones = (): string[] => {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone') as string[]
  }
  return ['UTC', 'Europe/London', 'Europe/Paris', 'Asia/Yerevan', 'America/New_York', 'America/Los_Angeles']
}

/** Build `(UTC±HH:MM) Zone/Name` options, sorted by label */
export const makeTimeZoneOptions = (now: Date = new Date()): TimeZoneOption[] => {
  const toOffset = (tz: string): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    }).formatToParts(now)
    const name = parts.find((p) => p.type === 'timeZoneName')?.value
    if (name && /^GMT[+-]/.test(name)) return name.replace('GMT', 'UTC')
    try {
      const fmt = (tzStr: string) =>
        new Intl.DateTimeFormat('en-GB', { timeZone: tzStr, hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
      const [hT, mT] = fmt(tz).split(':').map(Number)
      const [hU, mU] = fmt('UTC').split(':').map(Number)
      let diff = hT * 60 + mT - (hU * 60 + mU)
      if (diff <= -720) diff += 1440
      if (diff > 720) diff -= 1440
      const sign = diff >= 0 ? '+' : '-'
      const abs = Math.abs(diff)
      const hh = String(Math.floor(abs / 60)).padStart(2, '0')
      const mm = String(abs % 60).padStart(2, '0')
      return `UTC${sign}${hh}:${mm}`
    } catch {
      return 'UTC'
    }
  }

  return getAllTimeZones()
    .map((z) => {
      const offset = toOffset(z)
      return { label: `(${offset}) ${z}`, value: z }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}
