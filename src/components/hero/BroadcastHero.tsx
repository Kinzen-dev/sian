import Link from "next/link";
import type { MatchView } from "@/lib/view";
import { fmtKickoff } from "@/lib/format";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { ProbabilityBar } from "@/components/match/ProbabilityBar";
import { PickChip } from "@/components/match/PickChip";
import { KickoffCountdown } from "@/components/live/KickoffCountdown";

export function BroadcastHero({ m, countdown }: { m: MatchView; countdown: { iso: string; label: string; dateText: string }[] }) {
  const models = m.predictions.filter((p) => p.kind === "model");
  const baselines = m.predictions.filter((p) => p.kind === "baseline");
  const lead = models[0] ?? baselines[0] ?? null;
  return (
    <section className="floodlight rule-b" style={{ ["--home-glow" as string]: `${m.home.color}22`, ["--away-glow" as string]: `${m.away.color}22` }}>
      <div className="shell pt-8 pb-10 md:pt-12 md:pb-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm text-ink-2">
          <span>คู่ถัดไป {m.compLabel} {m.roundLabel}</span>
          <span className="data">{fmtKickoff(m.fixture.kickoffUtc)}</span>
        </div>

        <Link href={`/match/${m.fixture.matchId}`} className="block mt-4 hover:no-underline">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-6">
            <div className="min-w-0 text-right">
              <Numeral className="giant block">{m.home.tla}</Numeral>
              <div className="flex items-center justify-end gap-2 mt-2 text-ink-2"><span className="truncate">{m.home.nameTh}</span><Crest team={m.home} size={28} /></div>
            </div>
            <Numeral className="text-[clamp(1.5rem,5vw,4rem)] text-ink-3 pb-8">v</Numeral>
            <div className="min-w-0">
              <Numeral className="giant block">{m.away.tla}</Numeral>
              <div className="flex items-center gap-2 mt-2 text-ink-2"><Crest team={m.away} size={28} /><span className="truncate">{m.away.nameTh}</span></div>
            </div>
          </div>
        </Link>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] items-end">
          <div>
            {lead ? (
              <>
                <div className="flex items-center justify-between text-xs text-ink-2 mb-2">
                  <span>{lead.kind === "model" ? `ความน่าจะเป็นตาม ${lead.guruName}` : `ยังไม่มีเซียนล็อกคู่นี้ แสดงกูรูฐาน ${lead.guruName}`}</span>
                  <PickChip pick={lead.pick} home={m.home} away={m.away} />
                </div>
                <ProbabilityBar probs={lead.probs} homeColor={m.home.color} awayColor={m.away.color} pick={lead.pick} animate height={40} />
              </>
            ) : (
              <p className="text-ink-2">ยังไม่มีคำทำนายสำหรับคู่นี้</p>
            )}
            {(models.length > 0 || baselines.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {[...models, ...baselines].map((p) => (
                  <span key={p.guruId} className={`inline-flex items-center gap-2 ${p.kind === "baseline" ? "text-ink-3" : "text-ink-2"}`}>
                    <span>{p.guruName}</span><PickChip pick={p.pick} home={m.home} away={m.away} />
                    {p.scoreline && <Numeral className="text-base text-ink">{`${p.scoreline.home}-${p.scoreline.away}`}</Numeral>}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="frame p-4 bg-canvas/60 md:min-w-[19rem] min-w-0">
            <div className="text-xs text-ink-2 mb-1">นับถอยหลังถึงเวลาเตะ</div>
            <div className="text-3xl"><KickoffCountdown targets={countdown} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
