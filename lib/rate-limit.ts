type Entry = { hits: number[] };
const store = new Map<string, Entry>();

/** Small process-local sliding window. Deployments should additionally rate-limit at the edge. */
export function slidingWindow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((time) => time > now - windowMs);
  if (entry.hits.length >= limit) { store.set(key, entry); return false; }
  entry.hits.push(now); store.set(key, entry);
  return true;
}
