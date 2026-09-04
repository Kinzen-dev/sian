import Link from "next/link";
import type { MatchView } from "@/lib/view";
import { fmtKickoff } from "@/lib/format";
import { COPY } from "@/lib/copy";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { KickoffCountdown } from "@/components/live/KickoffCountdown";
import { FieldStage, type Opening } from "@/components/fx/FieldStage";
import { toCalls } from "@/components/hero/BroadcastHero";
import { CHAMPAGNE, VERMILION, mix } from "@/lib/club-colours";
import { outcomeOf } from "@/lib/scoring";

// Results night: the dust forms the real score of the round's featured match (champagne when the
// lead guru's call was right, vermilion-tinted when wrong), then relaxes into each guru's cloud.
export function ResultsHero({ m, roundLabel, countdown }: { m: MatchView; roundLabel: string; countdown: { iso: string; label: string; dateText: string }[] }) {
  const f = m.fixture;
  const calls = toCalls(m);
  const lead = calls.find((c) => c.kind === "model") ?? calls[0] ?? null;
  const result = f.score ? (f.score.regular ?? { home: f.score.home, away: f.score.away }) : null;
  const outcome = result ? outcomeOf(result) : null;
  const leadRight = lead && outcome ? lead.pick === outcome : true;
  const opening: Opening = result
    ? { kind: "text", text: `${result.home}-${result.away}`, colour: leadRight ? CHAMPAGNE : mix(VERMILION, CHAMPAGNE, 0.35), holdMs: 2600 }
    : { kind: "tlas" };
  const models = m.predictions.filter((p) => p.kind === "model");
  const h = COPY.home;

  const top = (
    <div className="shell w-full pt-6 md:pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm text-ink-2">
        <span><span className="text-champ font-semibold">{h.resultsLead}</span> {roundLabel}</span>
        <span className="data">{fmtKickoff(f.kickoffUtc)}</span>
      </div>
      <Link href={`/match/${f.matchId}`} className="mt-3 inline-flex flex-wrap items-center gap-x-4 gap-y-1 hover:no-underline">
        <span className="inline-flex items-center gap-2"><Crest team={m.home} size={28} /><Numeral className="text-2xl">{m.home.tla}</Numeral><span className="text-ink-2">{m.home.nameTh}</span></span>
        {result ? <Numeral className="text-3xl text-champ">{`${result.home}-${result.away}`}</Numeral> : <Numeral className="text-lg text-ink-3">v</Numeral>}
        <span className="inline-flex items-center gap-2"><span className="text-ink-2">{m.away.nameTh}</span><Numeral className="text-2xl">{m.away.tla}</Numeral><Crest team={m.away} size={28} /></span>
      </Link>
    </div>
  );

  const bottom = (
    <div className="shell w-full pb-6 md:pb-8 mt-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-[44ch]">
        <ul className="m-0 p-0 list-none grid gap-1 text-sm">
          {models.map((p) => {
            const right = outcome ? p.pick === outcome : null;
            const pts = p.score?.points?.total;
            return (
              <li key={p.guruId} className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
                <span className="text-ink font-medium">{p.guruName}</span>
                <Numeral className="text-base text-ink-2">{`${p.pick === "H" ? m.home.tla : p.pick === "A" ? m.away.tla : "DRAW"}${p.scoreline ? ` ${p.scoreline.home}-${p.scoreline.away}` : ""}`}</Numeral>
                {right != null && <span className={right ? "text-champ" : "recap-verm"}>{right ? h.resultsRight : h.resultsWrong}</span>}
                {pts != null && <span className="data text-ink-2">{pts.toFixed(1)} แต้ม</span>}
              </li>
            );
          })}
        </ul>
        <p className="m-0 mt-2 text-sm text-ink-2 thai-tight">
          {h.resultsExplainer}{" "}
          <Link href={`/match/${f.matchId}`} className="underline underline-offset-4 decoration-ink-3 text-ink">อ่านคู่นี้</Link>
          {" · "}
          <Link href={`/predictions/${m.competition}`} className="underline underline-offset-4 decoration-ink-3 text-ink">{h.boardLink}</Link>
        </p>
      </div>
      {countdown.length > 0 && (
        <div className="frame p-4 bg-canvas/70 md:min-w-[19rem] min-w-0" data-live>
          <div className="text-xs text-ink-2 mb-1">{h.nextUp}</div>
          <div className="text-3xl"><KickoffCountdown targets={countdown} /></div>
        </div>
      )}
    </div>
  );

  return (
    <FieldStage
      home={{ tla: m.home.tla, nameTh: m.home.nameTh, color: m.home.color }}
      away={{ tla: m.away.tla, nameTh: m.away.nameTh, color: m.away.color }}
      gurus={calls}
      leadId={lead?.id ?? null}
      opening={opening}
      minHeight="clamp(36rem, 88vh, 54rem)"
      topSlot={top}
      bottomSlot={bottom}
      scrollFade
      className="rule-b"
    />
  );
}
