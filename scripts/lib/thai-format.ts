// Thai-facing formatting for bot messages. Gregorian calendar, Asia/Bangkok, no Buddhist year.
const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function parts(iso: string): { wd: number; d: number; m: number; hh: string; mm: string } {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { wd, d: Number(p.day), m: Number(p.month), hh: p.hour === "24" ? "00" : p.hour, mm: p.minute };
}

// "เสาร์ 5 ก.ย. 02:00 น."
export function thaiKickoff(iso: string): string {
  const { wd, d, m, hh, mm } = parts(iso);
  return `${DAYS[wd]} ${d} ${MONTHS[m - 1]} ${hh}:${mm} น.`;
}

// "5 ก.ย." (no weekday) for compact ranges
export function thaiDate(iso: string): string {
  const { d, m } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

export function shortGuruName(displayName: string): string {
  return displayName.replace(/^Claude\s+/i, "").replace(/^GPT-/i, "GPT-");
}
