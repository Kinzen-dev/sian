// Convert a wall-clock time in an IANA zone to a UTC ISO string. Used for provider
// feeds that publish local kickoff times (openfootball = Europe/London, UEFA = CET/CEST).
export function zonedToUtc(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetMs = zoneOffsetMs(guess, timeZone);
  // Re-evaluate once at the corrected instant to survive a DST boundary.
  const corrected = guess - offsetMs;
  const offset2 = zoneOffsetMs(corrected, timeZone);
  return new Date(guess - offset2).toISOString();
}

function zoneOffsetMs(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(epochMs));
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * ((Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60_000);
}

export function nowIso(clock: () => Date = () => new Date()): string {
  return clock().toISOString();
}

export function hoursBetween(aIso: string, bIso: string): number {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 3_600_000;
}
