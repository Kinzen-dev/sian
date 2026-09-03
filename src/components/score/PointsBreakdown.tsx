import type { PredictionView } from "@/lib/view";
import { POINTS } from "@/lib/scoring";

const CELLS: { key: keyof typeof POINTS; th: string }[] = [
  { key: "outcome", th: "ผล" }, { key: "exact", th: "สกอร์" }, { key: "ou", th: "สูง/ต่ำ" }, { key: "btts", th: "ทั้งคู่ยิง" }, { key: "upset", th: "สวนเต็ง" },
];

export function PointsBreakdown({ preds }: { preds: PredictionView[] }) {
  const scored = preds.filter((p) => p.score?.points);
  if (scored.length === 0) return null;
  return (
    <div className="scroll-x">
      <table className="w-full text-sm min-w-[32rem]">
        <thead className="text-xs text-ink-3"><tr className="rule-b"><th className="text-left font-normal py-2">เซียน</th>{CELLS.map((c) => <th key={c.key} className="text-right font-normal py-2 px-2">{c.th}</th>)}<th className="text-right font-normal py-2 pl-2">รวม</th><th className="text-right font-normal py-2 pl-2">Brier</th></tr></thead>
        <tbody>
          {scored.map((p) => (
            <tr key={p.guruId} className={`rule-b ${p.kind === "baseline" ? "text-ink-2" : ""}`}>
              <td className="py-2">{p.guruName}{p.lock.late && <span className="text-hazard text-xs ml-2">ส่งช้า</span>}</td>
              {CELLS.map((c) => { const v = p.score!.points![c.key]; return <td key={c.key} className={`data text-right py-2 px-2 ${v > 0 ? "text-gold" : "text-ink-3"}`}>{v > 0 ? `+${v}` : "0"}</td>; })}
              <td className="data text-right py-2 pl-2 text-ink font-semibold">{p.score!.points!.total.toFixed(1)}</td>
              <td className="data text-right py-2 pl-2">{p.score!.brier?.toFixed(3) ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
