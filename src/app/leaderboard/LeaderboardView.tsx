import Link from "next/link";
import { getWorld, leaderboardView, recentRoundDelta } from "@/lib/view";
import { COMPETITION_LABEL, SITE } from "@/lib/site";
import { COPY } from "@/lib/copy";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HowToRead } from "@/components/ui/Term";
import { RollingNumber } from "@/components/ui/RollingNumber";
import type { Competition } from "@/lib/schema";

export async function LeaderboardView({ comp }: { comp: Competition | null }) {
  const w = await getWorld();
  const rows = leaderboardView(w, comp ?? undefined);
  const recent = recentRoundDelta(w, w.builtAt);
  const delta = recent && (!comp || recent.round.competition === comp) ? recent.delta : undefined;
  const deltaLabel = recent ? `${COPY.leaderboard.columns.delta} (${recent.label})` : undefined;
  const leader = rows.find((r) => r.rank === 1) ?? null;
  const t = COPY.leaderboard;
  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: "/leaderboard", label: t.tabAll, active: comp === null },
    { href: "/leaderboard/epl", label: COMPETITION_LABEL.epl.th, active: comp === "epl" },
    { href: "/leaderboard/ucl", label: COMPETITION_LABEL.ucl.th, active: comp === "ucl" },
  ];
  return (
    <main className="shell mt-8">
      <SectionHeading as="h1" title={comp ? `${t.title} ${COMPETITION_LABEL[comp].th}` : t.title} explainer={t.lead} aside={
        <nav className="flex gap-4 text-sm font-[family-name:var(--font-body)]" aria-label="เลือกรายการ">{tabs.map((x) => <Link key={x.href} href={x.href} aria-current={x.active ? "page" : undefined} className={x.active ? "text-ink underline underline-offset-4 decoration-gold" : "text-ink-2"}>{x.label}</Link>)}</nav>
      } />

      {leader ? (
        <section className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr] items-end">
          <div>
            <p className="m-0 text-sm text-ink-2">{t.leaderTitle}</p>
            <Link href={`/guru/${leader.guruId}`} className="text-champ text-2xl font-semibold hover:no-underline">{leader.profile.displayName}</Link>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Stat label={COPY.guru.statLabels.avgPoints} value={leader.avgPoints} digits={2} />
            <Stat label={COPY.guru.statLabels.accuracy} value={leader.accuracy * 100} digits={0} suffix="%" />
            <Stat label={COPY.guru.statLabels.brier} value={leader.meanBrier} digits={3} />
          </div>
        </section>
      ) : null}

      <div className="mt-6"><LeaderboardTable rows={rows}  delta={delta} deltaLabel={deltaLabel} /></div>
      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <HowToRead keys={["avgPoints", "accuracy", "exact", "brier", "coverage", "streak", "trial"]} title={t.howToRead} />
        <div className="text-sm text-ink-2 thai-tight grid gap-2 content-start">
          <p className="m-0">{t.baselinesNote}</p>
          <p className="m-0">{t.tieNote} {`ต้องจบครบ ${SITE.minScoredForRanking} คู่ถึงติดอันดับ`}</p>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, digits, suffix = "" }: { label: string; value: number; digits: number; suffix?: string }) {
  return (
    <div>
      <div className="text-xs text-ink-2">{label}</div>
      <div className="display text-3xl text-champ mt-0.5"><RollingNumber value={value} digits={digits} suffix={suffix} /></div>
    </div>
  );
}
