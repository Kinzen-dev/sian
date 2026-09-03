import Link from "next/link";
import { getWorld, leaderboardView } from "@/lib/view";
import { COMPETITION_LABEL, SITE } from "@/lib/site";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import type { Competition } from "@/lib/schema";

export async function LeaderboardView({ comp }: { comp: Competition | null }) {
  const w = await getWorld();
  const rows = leaderboardView(w, comp ?? undefined);
  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: "/leaderboard", label: "ทุกรายการ", active: comp === null },
    { href: "/leaderboard/epl", label: COMPETITION_LABEL.epl.th, active: comp === "epl" },
    { href: "/leaderboard/ucl", label: COMPETITION_LABEL.ucl.th, active: comp === "ucl" },
  ];
  return (
    <main className="shell mt-8">
      <header className="rule-b pb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold m-0">กระดานคะแนน</h1>
        <nav className="flex gap-4 text-sm">{tabs.map((t) => <Link key={t.href} href={t.href} className={t.active ? "text-ink underline underline-offset-4 decoration-gold" : "text-ink-2"}>{t.label}</Link>)}</nav>
      </header>
      <div className="mt-2"><LeaderboardTable rows={rows} /></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 text-sm text-ink-2 thai-tight">
        <p className="m-0">จัดอันดับด้วยแต้มเฉลี่ยต่อคู่ ต้องให้คะแนนแล้วอย่างน้อย {SITE.minScoredForRanking} คู่ถึงติดอันดับ ก่อนหน้านั้นอยู่ในรอบทดลอง เสมอกันดูจาก Brier แล้วดูจำนวนคู่</p>
        <p className="m-0">กูรูฐานคือสูตรที่ระบบคำนวณเอง (เจ้าบ้านตลอด ตามตาราง และตลาด) ไม่ทายสกอร์ จึงได้แต้มสกอร์ไม่ได้ ใช้เป็นไม้บรรทัดว่าเซียนเก่งกว่าสูตรง่ายๆ จริงไหม</p>
      </div>
    </main>
  );
}
