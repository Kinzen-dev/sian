import Link from "next/link";
import type { MatchView } from "@/lib/view";
import { fmtKickoff } from "@/lib/format";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { KickoffCountdown } from "@/components/live/KickoffCountdown";
import { FieldStage, type GuruCall } from "@/components/fx/FieldStage";

export function toCalls(m: MatchView): GuruCall[] {
  const models = m.predictions.filter((p) => p.kind === "model");
  const baselines = m.predictions.filter((p) => p.kind === "baseline");
  return [...models, ...baselines].map((p) => ({ id: p.guruId, name: p.guruName, kind: p.kind, probs: p.probs, pick: p.pick, scoreline: p.scoreline }));
}

// The one authored moment on the site: a million gold-dust particles burst, collapse into the two club
// codes, then settle into the featured guru's probabilities. Everything readable is server-rendered DOM.
export function BroadcastHero({ m, countdown }: { m: MatchView; countdown: { iso: string; label: string; dateText: string }[] }) {
  const calls = toCalls(m);
  const lead = calls.find((c) => c.kind === "model") ?? calls[0] ?? null;
  const top = (
    <div className="shell w-full pt-6 md:pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm text-ink-2">
        <span>คู่ใหญ่ที่ใกล้จะเตะ {m.compLabel} {m.roundLabel}</span>
        <span className="data">{fmtKickoff(m.fixture.kickoffUtc)}</span>
      </div>
      <Link href={`/match/${m.fixture.matchId}`} className="mt-3 inline-flex flex-wrap items-center gap-x-4 gap-y-1 hover:no-underline">
        <span className="inline-flex items-center gap-2"><Crest team={m.home} size={28} /><Numeral className="text-2xl">{m.home.tla}</Numeral><span className="text-ink-2">{m.home.nameTh}</span></span>
        <Numeral className="text-lg text-ink-3">v</Numeral>
        <span className="inline-flex items-center gap-2"><span className="text-ink-2">{m.away.nameTh}</span><Numeral className="text-2xl">{m.away.tla}</Numeral><Crest team={m.away} size={28} /></span>
      </Link>
    </div>
  );
  const bottom = (
    <div className="shell w-full pb-6 md:pb-8 mt-6 flex flex-wrap items-end justify-between gap-4">
      <p className="m-0 text-sm text-ink-2 max-w-[38ch] thai-tight">
        {lead ? (lead.kind === "model" ? `ตัวเลขด้านบนคือความเห็นของ ${lead.name} ก่อนเตะ ล็อกไว้แล้ว แก้ไม่ได้` : "ยังไม่มีเซียนล็อกคู่นี้ ตัวเลขด้านบนคือค่าอ้างอิงจากสูตรพื้นฐาน") : "ยังไม่มีคำทำนายสำหรับคู่นี้"}
        {" "}<Link href={`/match/${m.fixture.matchId}`} className="underline underline-offset-4 decoration-ink-3 text-ink">อ่านบทวิเคราะห์เต็ม</Link>
      </p>
      <div className="frame p-4 bg-canvas/70 md:min-w-[19rem] min-w-0" data-live>
        <div className="text-xs text-ink-2 mb-1">นับถอยหลังถึงเวลาเตะ</div>
        <div className="text-3xl"><KickoffCountdown targets={countdown} /></div>
      </div>
    </div>
  );
  return (
    <FieldStage
      home={{ tla: m.home.tla, nameTh: m.home.nameTh, color: m.home.color }}
      away={{ tla: m.away.tla, nameTh: m.away.nameTh, color: m.away.color }}
      gurus={calls}
      leadId={lead?.id ?? null}
      opening={{ kind: "tlas" }}
      minHeight="clamp(36rem, 88vh, 54rem)"
      topSlot={top}
      bottomSlot={bottom}
      scrollFade
      className="rule-b"
    />
  );
}
