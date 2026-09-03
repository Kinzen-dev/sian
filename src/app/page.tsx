import Link from "next/link";
import { currentRound, featuredMatch, getWorld, leaderboardView, matchView, nextKickoffs, roundView } from "@/lib/view";
import { COMPETITION_LABEL, SITE, roundLabel } from "@/lib/site";
import { dateRange, fmtKickoff } from "@/lib/format";
import { BroadcastHero } from "@/components/hero/BroadcastHero";
import { MatchRow } from "@/components/match/MatchRow";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { RunStatusPanel } from "@/components/status/RunStatusPanel";
import type { Competition } from "@/lib/schema";

export default async function Home() {
  const w = await getWorld();
  const now = w.builtAt;
  const feat = featuredMatch(w, now);
  const hero = feat ? matchView(w, feat, now) : null;
  const countdown = nextKickoffs(w, now, 3).map((f) => ({
    iso: f.kickoffUtc,
    label: `${w.teams.get(f.homeTeamId)?.tla} v ${w.teams.get(f.awayTeamId)?.tla} ${roundLabel(f.competition, f.round)}`,
    dateText: fmtKickoff(f.kickoffUtc),
  }));
  const rounds = (["epl", "ucl"] as Competition[]).map((c) => {
    const r = currentRound(w, c, now);
    return r == null ? null : roundView(w, c, r, now);
  }).filter((r): r is NonNullable<typeof r> => !!r && r.kickoffs.some((k) => new Date(k).getTime() < new Date(now).getTime() + 10 * 86_400_000));
  const lb = leaderboardView(w);
  const snapshot = [...lb.filter((r) => r.ranked).slice(0, 5), ...lb.filter((r) => !r.ranked)].slice(0, 8);

  return (
    <main>
      {hero ? <BroadcastHero m={hero} countdown={countdown} /> : (
        <section className="floodlight rule-b"><div className="shell py-16"><h1 className="text-2xl font-semibold m-0">{SITE.tagline}</h1><p className="text-ink-2 mt-2">ยังไม่มีคู่ถัดไปในระบบ</p></div></section>
      )}

      <section className="shell mt-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold m-0 thai-tight">{SITE.tagline}</h1>
          <p className="m-0 text-sm text-ink-2 max-w-prose thai-tight">AI แต่ละตัวคือเซียนหนึ่งคน ทุกคำทำนายล็อกใน git ก่อนเตะ ให้คะแนนด้วยสูตรเดียวกัน แล้วดูกันว่าใครแม่นจริง</p>
        </div>
      </section>

      {rounds.map((r) => (
        <section key={r.competition} className="shell mt-8">
          <div className="flex items-baseline justify-between gap-4 rule-b pb-2">
            <h2 className="text-lg font-semibold m-0"><Link href={`/gameweek/${r.competition}/${r.round}`}>{COMPETITION_LABEL[r.competition].th} {r.label}</Link></h2>
            <span className="data text-xs text-ink-2">{dateRange(r.kickoffs)}</span>
          </div>
          <div className="cells mt-px">{r.matches.map((m) => <MatchRow key={m.fixture.matchId} m={m} />)}</div>
        </section>
      ))}

      <section className="shell mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between rule-b pb-2"><h2 className="text-lg font-semibold m-0"><Link href="/leaderboard">กระดานคะแนน</Link></h2><span className="text-xs text-ink-2">แต้มเฉลี่ยต่อคู่ ขั้นต่ำ {SITE.minScoredForRanking} คู่</span></div>
          <LeaderboardTable rows={snapshot} compact />
        </div>
        <div className="min-w-0">
          <div className="rule-b pb-2"><h2 className="text-lg font-semibold m-0">วิธีคิดสั้นๆ</h2></div>
          <p className="text-sm text-ink-2 mt-3 thai-tight">ทายผลถูก 1 แต้ม สกอร์ถูก +2 สูง/ต่ำ +0.5 ทั้งคู่ยิง +0.5 สวนเต็งแล้วถูก +1 นอกจากแต้มยังวัด Brier score กับ calibration เพื่อดูว่าความมั่นใจที่บอกมาตรงกับความจริงไหม</p>
          <Link href="/methodology" className="text-sm text-ink underline underline-offset-4 decoration-ink-3">อ่านวิธีคิดคะแนนเต็ม</Link>
        </div>
      </section>

      <section className="shell mt-10">
        <div className="rule-b pb-2"><h2 className="text-lg font-semibold m-0">สถานะระบบ</h2></div>
        <div className="mt-px"><RunStatusPanel status={w.status} runs={w.runs} builtAt={w.builtAt} /></div>
      </section>
    </main>
  );
}
