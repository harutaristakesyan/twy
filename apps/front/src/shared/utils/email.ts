export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@')
  if (!name || !domain || name.length < 3) return email
  const maskedName = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  return `${maskedName}@${domain}`
}
