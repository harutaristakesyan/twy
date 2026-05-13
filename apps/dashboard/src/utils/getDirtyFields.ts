export function getDirtyFields<T extends object>(original: T, current: T): Partial<T> {
  const dirty: Partial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) {
    const a = current[key] ?? null;
    const b = original[key] ?? null;
    if (a !== b) {
      dirty[key] = current[key];
    }
  }
  return dirty;
}
