import type { FactPack } from "@/lib/schema";
import type { MatchView } from "@/lib/view";
import { pct } from "@/lib/format";
import { Numeral } from "@/components/ui/Numeral";

export function FactPackDigest({ fp, m }: { fp: FactPack; m: MatchView }) {
  const sides = [{ t: m.home, s: fp.home }, { t: m.away, s: fp.away }];
  return (
    <div className="cells grid-cols-1 sm:grid-cols-2">
      {sides.map(({ t, s }) => (
        <div key={t.teamId} className="p-4 min-w-0">
          <div className="flex items-baseline gap-2"><Numeral className="text-2xl">{t.tla}</Numeral><span className="text-sm text-ink-2 truncate">{t.nameTh}</span></div>
          <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-3">อันดับ</dt><dd className="m-0 data">{s.standing ? `${s.standing.pos}` : "-"}</dd>
            <dt className="text-ink-3">แต้ม</dt><dd className="m-0 data">{s.standing ? `${s.standing.pts} จาก ${s.standing.played} นัด (${s.standing.gd >= 0 ? "+" : ""}${s.standing.gd})` : "ยังไม่มีตาราง"}</dd>
            <dt className="text-ink-3">ฟอร์ม</dt><dd className="m-0 data">{s.formAll.length ? s.formAll.map((f) => f.result).join(" ") : "ยังไม่มีนัดที่จบ"}</dd>
            <dt className="text-ink-3">xG ล่าสุด</dt><dd className="m-0 data">{s.formAll.some((f) => f.xgFor != null) ? s.formAll.filter((f) => f.xgFor != null).map((f) => `${f.xgFor!.toFixed(2)}-${f.xgAgainst!.toFixed(2)}`).join(" ") : "ไม่มีข้อมูล"}</dd>
            <dt className="text-ink-3">พักมาแล้ว</dt><dd className="m-0 data">{s.restDays != null ? `${s.restDays} วัน` : "-"}</dd>
          </dl>
        </div>
      ))}
      <div className="p-4 sm:col-span-2 text-sm min-w-0">
        <div className="grid gap-1 sm:grid-cols-2">
          <div><span className="text-ink-3">ตลาด </span>{fp.market ? <span className="data">{m.home.tla} {pct(fp.market.probs.H)} เสมอ {pct(fp.market.probs.D)} {m.away.tla} {pct(fp.market.probs.A)} ({fp.market.n} เจ้า)</span> : <span className="text-ink-2">ไม่มีข้อมูลตลาดตอนสร้างชุดข้อมูล</span>}</div>
          <div><span className="text-ink-3">เจอกันฤดูกาลนี้ </span>{fp.h2h.length ? <span className="data">{fp.h2h.map((h) => `${h.home}-${h.away}`).join(", ")}</span> : <span className="text-ink-2">ยังไม่เคย</span>}</div>
        </div>
        <ul className="m-0 mt-2 p-0 list-none text-xs text-ink-3 data break-words">{fp.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>
    </div>
  );
}
