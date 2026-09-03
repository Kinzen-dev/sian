import type { PredictionView } from "@/lib/view";
import type { MatchView } from "@/lib/view";
import { ProbabilityBar } from "@/components/match/ProbabilityBar";
import { PickChip } from "@/components/match/PickChip";
import { LockBadge } from "@/components/match/LockBadge";
import { Numeral } from "@/components/ui/Numeral";
import { pct } from "@/lib/format";

const SECTIONS: { key: string; th: string }[] = [
  { key: "form", th: "ฟอร์ม" },
  { key: "headToHead", th: "ประวัติเจอกัน" },
  { key: "tactical", th: "แทคติกปะทะ" },
  { key: "personnel", th: "ตัวผู้เล่นและตัวเจ็บ" },
  { key: "trends", th: "แนวโน้มและ xG" },
  { key: "market", th: "มุมมองตลาด" },
  { key: "verdict", th: "ฟันธง" },
  { key: "risk", th: "ความเสี่ยง" },
];

const CONF: Record<string, string> = { low: "มั่นใจน้อย", mid: "มั่นใจปานกลาง", high: "มั่นใจสูง" };

export function AnalysisPanel({ p, m, wide = false }: { p: PredictionView; m: MatchView; wide?: boolean }) {
  return (
    <article className={`min-w-0 ${wide ? "lg:max-w-5xl" : ""}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold m-0">{p.guruName}</h3>
        <LockBadge lock={p.lock} compact />
      </header>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-ink-2">ฟันธง</div>
          <div className="flex items-center gap-3"><PickChip pick={p.pick} home={m.home} away={m.away} size="lg" />{p.scoreline && <Numeral className="text-3xl">{`${p.scoreline.home}-${p.scoreline.away}`}</Numeral>}</div>
        </div>
        <div className="text-right text-xs text-ink-2">
          {p.confidence && <div>{CONF[p.confidence]}</div>}
          <div className="data">{p.over25 ? "สูง 2.5" : "ต่ำ 2.5"} {p.btts ? "ทั้งคู่ยิง" : "ไม่ยิงทั้งคู่"}</div>
        </div>
      </div>
      <div className="mt-3"><ProbabilityBar probs={p.probs} homeColor={m.home.color} awayColor={m.away.color} pick={p.pick} height={22} /></div>
      <div className="data text-xs text-ink-3 mt-1 flex justify-between"><span>{m.home.tla} {pct(p.probs.H)}</span><span>เสมอ {pct(p.probs.D)}</span><span>{m.away.tla} {pct(p.probs.A)}</span></div>
      {p.keyFactor && <p className="mt-4 text-base text-ink border-l-2 border-gold pl-3 thai-tight">{p.keyFactor}</p>}
      {p.analysis && (
        <dl className={`mt-4 grid gap-4 ${wide ? "lg:grid-cols-2 lg:gap-x-10" : ""}`}>
          {SECTIONS.map((s) => p.analysis![s.key] ? (
            <div key={s.key} className="rule-t pt-3">
              <dt className="text-xs text-ink-2">{s.th}</dt>
              <dd className="m-0 mt-1 text-[0.95rem] leading-7 thai-tight max-w-prose">{p.analysis![s.key]}</dd>
            </div>
          ) : null)}
        </dl>
      )}
      {p.sources.length > 0 && (
        <div className="rule-t mt-4 pt-3">
          <div className="text-xs text-ink-2">แหล่งอ้างอิง</div>
          <ul className="m-0 mt-1 p-0 list-none grid gap-1 text-sm">
            {p.sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener noreferrer" target="_blank" className="text-ink-2 hover:text-ink break-all">{s.title}</a></li>)}
          </ul>
        </div>
      )}
      {p.review && (
        <div className="rule-t mt-4 pt-3">
          <div className="text-xs text-ink-2">รีวิวหลังจบเกม {p.review.verdict === "reasoning" ? "(เหตุผลพลาด)" : "(ความแปรปรวนของเกม)"}</div>
          <p className="mt-1 text-sm leading-7 thai-tight max-w-prose">{p.review.bodyTh}</p>
          {p.review.lesson && <p className="mt-1 text-sm text-gold thai-tight">บทเรียน: {p.review.lesson}</p>}
        </div>
      )}
    </article>
  );
}
