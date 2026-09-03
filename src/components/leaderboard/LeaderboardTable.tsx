import Link from "next/link";
import type { LeaderboardRow } from "@/lib/aggregate";
import { SITE } from "@/lib/site";
import { pct } from "@/lib/format";

// Dense table. Baselines are pinned visually (dimmer, marked); trial rows sit under a rule.
export function LeaderboardTable({ rows, compact = false }: { rows: LeaderboardRow[]; compact?: boolean }) {
  const ranked = rows.filter((r) => r.ranked);
  const trial = rows.filter((r) => !r.ranked);
  return (
    <div className="scroll-x">
      <table className="w-full text-sm min-w-[40rem]">
        <thead className="text-xs text-ink-3">
          <tr className="rule-b">
            <th className="text-left font-normal py-2 pr-2 w-8">#</th>
            <th className="text-left font-normal py-2">เซียน</th>
            <th className="text-right font-normal py-2 px-2">คู่</th>
            <th className="text-right font-normal py-2 px-2">แต้ม/คู่</th>
            <th className="text-right font-normal py-2 px-2">ผลถูก</th>
            {!compact && <th className="text-right font-normal py-2 px-2">สกอร์ถูก</th>}
            <th className="text-right font-normal py-2 px-2">Brier</th>
            {!compact && <th className="text-right font-normal py-2 px-2">ครอบคลุม</th>}
            {!compact && <th className="text-right font-normal py-2 pl-2">สตรีค</th>}
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => <Row key={r.guruId} r={r} compact={compact} />)}
          {ranked.length === 0 && (
            <tr><td colSpan={9} className="py-6 text-ink-2">ยังไม่มีเซียนที่ให้คะแนนครบ {SITE.minScoredForRanking} คู่ กระดานจะเริ่มจัดอันดับเมื่อผ่านเกณฑ์</td></tr>
          )}
          {trial.length > 0 && (
            <tr><td colSpan={9} className="pt-4 pb-1 text-xs text-ink-3 border-t-2 border-rule-strong">รอบทดลอง (ยังไม่ครบ {SITE.minScoredForRanking} คู่)</td></tr>
          )}
          {trial.map((r) => <Row key={r.guruId} r={r} compact={compact} />)}
        </tbody>
      </table>
    </div>
  );
}

function Row({ r, compact }: { r: LeaderboardRow; compact: boolean }) {
  const dim = r.profile.kind === "baseline";
  return (
    <tr className={`rule-b ${dim ? "text-ink-2" : ""}`}>
      <td className="data py-2 pr-2 text-ink-3">{r.rank ?? "-"}</td>
      <td className="py-2">
        <Link href={`/guru/${r.guruId}`} className="inline-flex items-center gap-2">
          <span className={dim ? "" : "text-ink font-medium"}>{r.profile.displayName}</span>
          {dim && <span className="text-[0.65rem] text-ink-3 frame px-1">ฐาน</span>}
        </Link>
      </td>
      <td className="data text-right py-2 px-2">{r.scored}</td>
      <td className={`data text-right py-2 px-2 ${dim ? "" : "text-gold"}`}>{r.scored ? r.avgPoints.toFixed(2) : "-"}</td>
      <td className="data text-right py-2 px-2">{r.scored ? pct(r.accuracy) : "-"}</td>
      {!compact && <td className="data text-right py-2 px-2">{r.scored ? pct(r.exactRate) : "-"}</td>}
      <td className="data text-right py-2 px-2">{r.scored ? r.meanBrier.toFixed(3) : "-"}</td>
      {!compact && <td className="data text-right py-2 px-2">{r.eligibleMatches ? pct(r.coverage) : "-"}</td>}
      {!compact && <td className="data text-right py-2 pl-2">{r.streak.kind ? `${r.streak.kind}${r.streak.length}` : "-"}</td>}
    </tr>
  );
}
