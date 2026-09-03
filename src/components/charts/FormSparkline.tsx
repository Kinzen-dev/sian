// Points per scored match in kickoff order. One series; the dots carry outcome (filled = outcome right).
export function FormSparkline({ points, max = 5 }: { points: { label: string; points: number; outcome: boolean }[]; max?: number }) {
  const n = points.length;
  if (n === 0) return <p className="text-sm text-ink-3">ยังไม่มีคู่ที่ให้คะแนน</p>;
  const W = Math.max(160, n * 22), H = 56, P = 8;
  const x = (i: number) => (n === 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.points).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-full h-auto" role="img" aria-label={`แต้มต่อคู่ ${points.map((p) => p.points).join(", ")}`}>
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="var(--rule)" />
      <path d={d} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.points)} r={4} fill={p.outcome ? "var(--gold)" : "var(--canvas)"} stroke="var(--gold)" strokeWidth={2}>
          <title>{`${p.label} ${p.points.toFixed(1)} แต้ม`}</title>
        </circle>
      ))}
    </svg>
  );
}
