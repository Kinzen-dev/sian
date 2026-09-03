import type { CalibrationBin } from "@/lib/aggregate";
import { pct } from "@/lib/format";

// Reliability diagram: stated probability of the pick (x) vs how often the pick was right (y).
// One series, so no legend; the diagonal is the reference. Dots scale with n. Table view below for screen readers and print.
export function CalibrationChart({ bins, minN = 1 }: { bins: CalibrationBin[]; minN?: number }) {
  const W = 320, H = 240, P = { l: 36, r: 12, t: 12, b: 32 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const x = (v: number) => P.l + v * iw, y = (v: number) => P.t + (1 - v) * ih;
  const pts = bins.filter((b) => b.n >= minN);
  const maxN = Math.max(1, ...pts.map((b) => b.n));
  const path = pts.map((b, i) => `${i ? "L" : "M"}${x(b.meanProb).toFixed(1)},${y(b.hitRate).toFixed(1)}`).join(" ");
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[24rem] h-auto" role="img" aria-label="กราฟความแม่นของความน่าจะเป็นที่ระบุ เทียบกับผลจริง">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--rule)" strokeWidth={1} />
            <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
            <text x={x(t)} y={H - 10} textAnchor="middle" fontSize={10} fill="var(--ink-3)" className="data">{Math.round(t * 100)}</text>
            <text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--ink-3)" className="data">{Math.round(t * 100)}</text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="4 4" />
        {path && <path d={path} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((b) => (
          <circle key={b.lo} cx={x(b.meanProb)} cy={y(b.hitRate)} r={4 + 6 * Math.sqrt(b.n / maxN)} fill="var(--gold)" stroke="var(--canvas)" strokeWidth={2}>
            <title>{`ระบุ ${pct(b.meanProb)} ถูก ${pct(b.hitRate)} จาก ${b.n} คู่`}</title>
          </circle>
        ))}
        <text x={x(0.5)} y={H - 0} textAnchor="middle" fontSize={10} fill="var(--ink-2)">ความน่าจะเป็นที่ระบุ (%)</text>
        <text x={10} y={y(0.5)} textAnchor="middle" fontSize={10} fill="var(--ink-2)" transform={`rotate(-90 10 ${y(0.5)})`}>ถูกจริง (%)</text>
      </svg>
      <figcaption className="sr-only">เส้นประคือเส้นสมบูรณ์แบบ จุดเหนือเส้น = ประเมินตัวเองต่ำไป ใต้เส้น = มั่นใจเกินจริง</figcaption>
      <table className="mt-3 w-full text-xs text-ink-2 data">
        <thead><tr className="text-ink-3"><th className="text-left font-normal py-1">ช่วง</th><th className="text-right font-normal">คู่</th><th className="text-right font-normal">ถูก</th></tr></thead>
        <tbody>
          {bins.filter((b) => b.n > 0).map((b) => (
            <tr key={b.lo} className="rule-t"><td className="py-1">{Math.round(b.lo * 100)}-{Math.round(b.hi * 100)}%</td><td className="text-right">{b.n}</td><td className="text-right">{pct(b.hitRate)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
