import Link from "next/link";
import type { LeaderboardRow } from "@/lib/aggregate";
import { SITE } from "@/lib/site";
import { pct } from "@/lib/format";
import { COPY, GLOSSARY, baselineLine } from "@/lib/copy";

// Dense table. The leader glows champagne; baselines are dimmer and carry their one-line rule on hover;
// gurus still in the trial period sit under a rule. Column headers explain themselves on hover.
export function LeaderboardTable({ rows, compact = false, delta, deltaLabel }: { rows: LeaderboardRow[]; compact?: boolean; delta?: Record<string, number>; deltaLabel?: string }) {
  const ranked = rows.filter((r) => r.ranked);
  const trial = rows.filter((r) => !r.ranked);
  const c = COPY.leaderboard.columns;
  const th = (label: string, gloss: string, cls = "text-right") => (
    <th className={`${cls} font-normal py-2 px-2 first:pl-0 last:pr-0`}><span className="term" title={gloss}>{label}</span></th>
  );
  return (
    <div>
      {ranked.length === 0 && (
        <p className="m-0 mb-4 text-ink-2 thai-tight max-w-[60ch]"><span className="text-ink">{COPY.leaderboard.emptyTitle}</span> {COPY.leaderboard.emptyBody(SITE.minScoredForRanking)}</p>
      )}
      <div className="scroll-x">
      <table className="w-full text-sm min-w-[40rem]">
        <thead className="text-xs text-ink-3">
          <tr className="rule-b">
            <th className="text-left font-normal py-2 pr-2 w-8">{c.rank}</th>
            <th className="text-left font-normal py-2">{c.guru}</th>
            {delta && th(deltaLabel ?? c.delta, COPY.home.deltaHint)}
            {th(c.scored, GLOSSARY.scored.gloss)}
            {th(c.avgPoints, GLOSSARY.avgPoints.gloss)}
            {th(c.accuracy, GLOSSARY.accuracy.gloss)}
            {!compact && th(c.exact, GLOSSARY.exact.gloss)}
            {th(c.brier, GLOSSARY.brier.gloss)}
            {!compact && th(c.coverage, GLOSSARY.coverage.gloss)}
            {!compact && th(c.streak, GLOSSARY.streak.gloss)}
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => <Row key={r.guruId} r={r} compact={compact} leader={r.rank === 1} delta={delta} />)}
          {trial.length > 0 && (
            <tr><td colSpan={10} className="pt-5 pb-1 text-xs text-ink-3 border-t-2 border-rule-strong"><span className="term" title={GLOSSARY.trial.gloss}>{COPY.leaderboard.trialHeading(SITE.minScoredForRanking)}</span></td></tr>
          )}
          {trial.map((r) => <Row key={r.guruId} r={r} compact={compact} leader={false} delta={delta} />)}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Row({ r, compact, leader, delta }: { r: LeaderboardRow; compact: boolean; leader: boolean; delta?: Record<string, number> }) {
  const dim = r.profile.kind === "baseline";
  const line = dim ? baselineLine(r.guruId) : null;
  const cell = (v: string, gold = false) => <td className={`data text-right py-2 px-2 last:pr-0 ${gold ? (leader ? "text-champ" : "text-gold") : ""}`}>{v}</td>;
  return (
    <tr className={`rule-b row-lift ${dim ? "text-ink-2" : ""} ${leader ? "bg-champ-wash" : ""}`}>
      <td className={`data py-2 pr-2 ${leader ? "text-champ" : "text-ink-3"}`}>{r.rank ?? "-"}</td>
      <td className="py-2">
        <Link href={`/guru/${r.guruId}`} className="group inline-flex items-center gap-2 hover:no-underline" title={line ?? undefined}>
          <span className={`lift ${dim ? "" : leader ? "text-champ font-semibold" : "text-ink font-medium"}`}>{r.profile.displayName}</span>
          {dim && <span className="text-[0.65rem] text-ink-3 frame px-1">{COPY.leaderboard.baseTag}</span>}
          {line && <span className="hidden lg:inline text-xs text-ink-3 thai-tight">{line}</span>}
        </Link>
      </td>
      {delta && (delta[r.guruId] != null ? <td className={`data text-right py-2 px-2 ${leader ? "text-champ" : "text-gold"}`}>{`+${delta[r.guruId].toFixed(1)}`}</td> : <td className="data text-right py-2 px-2 text-ink-3">-</td>)}
      {cell(String(r.scored))}
      {cell(r.scored ? r.avgPoints.toFixed(2) : "-", !dim)}
      {cell(r.scored ? pct(r.accuracy) : "-")}
      {!compact && cell(r.scored ? pct(r.exactRate) : "-")}
      {cell(r.scored ? r.meanBrier.toFixed(3) : "-")}
      {!compact && cell(r.eligibleMatches ? pct(r.coverage) : "-")}
      {!compact && cell(r.streak.kind ? `${r.streak.kind}${r.streak.length}` : "-")}
    </tr>
  );
}
