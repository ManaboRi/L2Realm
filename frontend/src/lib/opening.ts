const OPENING_DAY_MS = 24 * 60 * 60 * 1000;

export function isOpeningStillSoon(value?: string | Date | null, nowTs = Date.now()): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  return !Number.isNaN(t) && t + OPENING_DAY_MS > nowTs;
}
