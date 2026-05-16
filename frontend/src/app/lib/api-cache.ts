const TTL = 60_000; // 1 minute

interface Entry<T> { data: T; ts: number }
const store: Record<string, Entry<unknown>> = {};

export function getCached<T>(key: string): T | null {
  const e = store[key] as Entry<T> | undefined;
  if (!e || Date.now() - e.ts > TTL) return null;
  return e.data;
}

export function setCached<T>(key: string, data: T) {
  store[key] = { data, ts: Date.now() };
}

export function bust(...keys: string[]) {
  for (const k of keys) delete store[k];
}
