/**
 * Visibility dates (F-012 CA-4) are stored in UTC and edited in Zurich time, whatever the
 * editor's own time zone. `local` is the value of an `<input type="datetime-local">`.
 */
export const SHOP_TIME_ZONE = "Europe/Zurich";

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Zurich wall-clock time as if it were UTC, in ms. */
function wallClock(ms: number): number {
  const parts = Object.fromEntries(PARTS.formatToParts(ms).map((p) => [p.type, p.value]));
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-12-24T18:00" in Zurich → ISO in UTC. `null` when empty or malformed. */
export function zurichToUtc(local: string): string | null {
  const match = LOCAL.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes settle the offset, also next to a daylight-saving change.
  let guess = asUtc - (wallClock(asUtc) - asUtc);
  guess = asUtc - (wallClock(guess) - guess);
  return new Date(guess).toISOString();
}

/** ISO in UTC → "2026-12-24T18:00" in Zurich. Empty when there is no valid date. */
export function utcToZurich(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  return new Date(wallClock(ms)).toISOString().slice(0, 16);
}
