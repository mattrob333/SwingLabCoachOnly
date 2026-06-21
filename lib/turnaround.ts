/** Render an ISO-8601 duration like "PT24H" as a human label. */
export function humanizeTurnaround(iso: string): string {
  const hours = /PT(?:(\d+)H)?(?:(\d+)M)?/i.exec(iso);
  if (!hours) return iso;
  const h = Number(hours[1] ?? 0);
  const m = Number(hours[2] ?? 0);
  if (h && m) return `within ${h}h ${m}m`;
  if (h) return `within ${h} hours`;
  if (m) return `within ${m} minutes`;
  return iso;
}
