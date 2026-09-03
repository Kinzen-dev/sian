// EPL played matches with xG and closing odds. Post-match enrichment only.
export const E0_URL = "https://www.football-data.co.uk/mmz4281/2627/E0.csv";

export type E0Row = {
  date: string; // YYYY-MM-DD
  homeName: string;
  awayName: string;
  fthg: number;
  ftag: number;
  hxg: number | null;
  axg: number | null;
};

export function parseE0(csv: string): E0Row[] {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(",");
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`E0.csv: missing column ${name}`);
    return i;
  };
  const iDate = col("Date"), iH = col("HomeTeam"), iA = col("AwayTeam"), iFTHG = col("FTHG"), iFTAG = col("FTAG");
  const iHxG = header.indexOf("HxG"), iAxG = header.indexOf("AxG");
  return lines.slice(1).map((line) => {
    const c = line.split(",");
    const [d, m, y] = c[iDate].split("/");
    const num = (i: number) => (i >= 0 && c[i] !== "" ? Number(c[i]) : null);
    return {
      date: `${y}-${m}-${d}`,
      homeName: c[iH],
      awayName: c[iA],
      fthg: Number(c[iFTHG]),
      ftag: Number(c[iFTAG]),
      hxg: num(iHxG),
      axg: num(iAxG),
    };
  });
}
