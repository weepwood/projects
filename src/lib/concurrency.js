/** Run `worker` over `items` with a fixed number of in-flight promises. */
export async function mapConcurrent(items, limit, worker) {
  const list = Array.from(items);
  const results = new Array(list.length);
  let cursor = 0;

  async function drain() {
    while (cursor < list.length) {
      const index = cursor++;
      results[index] = await worker(list[index], index);
    }
  }

  const lanes = Math.max(1, Math.min(Number(limit) || 1, list.length));
  await Promise.all(Array.from({ length: lanes }, drain));
  return results;
}

export function daysBetween(older, newer = new Date()) {
  const oldTime = Date.parse(older || '');
  const newTime = newer instanceof Date ? newer.getTime() : Date.parse(newer || '');
  if (!Number.isFinite(oldTime) || !Number.isFinite(newTime)) return Infinity;
  return Math.max(0, (newTime - oldTime) / 86_400_000);
}

export function hoursBetween(older, newer = new Date()) {
  return daysBetween(older, newer) * 24;
}

export function toIso(value = new Date()) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
