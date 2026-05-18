export const passwordChecks = [
  { key: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { key: "number", label: "One number", test: (v: string) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character (!@#$%^&*)",
    test: (v: string) => /[!@#$%^&*]/.test(v),
  },
];

export function validatePassword(value = "") {
  const results = passwordChecks.map((c) => ({ ...c, valid: c.test(value) }));
  return { isValid: results.every((r) => r.valid), results };
}
