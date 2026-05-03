/**
 * Reuses one in-flight promise per key so concurrent identical calls (e.g. React Strict Mode
 * remounting a route) coalesce to a single network request.
 */
export function shareInFlightPromise<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const promise = run().finally(() => {
    if (cache.get(key) === promise) {
      cache.delete(key);
    }
  });
  cache.set(key, promise);
  return promise;
}
