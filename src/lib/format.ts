// All dates are formatted here, on the server, in Asia/Bangkok with the Gregorian calendar.
// th-TH defaults to the Buddhist calendar, so the calendar is pinned explicitly.
const TZ = "Asia/Bangkok";
const LOCALE = "th-TH-u-ca-gregory-nu-latn";

export function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
  return `${date} ${fmtTime(iso)} น.`;
}

export function fmtDate(iso: string, withYear = false): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(new Date(iso));
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso, true)} ${fmtTime(iso)} น.`;
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function fmtUk(iso: string): string {
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  return `${t} UK`;
}

export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function num(x: number, digits = 2): string {
  return x.toFixed(digits);
}

export function shortHash(h: string): string {
  return h.slice(0, 7);
}

export function dateRange(isos: string[]): string {
  if (isos.length === 0) return "";
  const sorted = [...isos].sort();
  const a = fmtDate(sorted[0]), b = fmtDate(sorted[sorted.length - 1]);
  return a === b ? a : `${a} ถึง ${b}`;
}
