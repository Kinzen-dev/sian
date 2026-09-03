import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="rule-t mt-16">
      <div className="shell py-8 grid gap-6 md:grid-cols-[1fr_auto] text-sm text-ink-2">
        <div className="max-w-prose">
          <p className="text-ink">บทวิเคราะห์ ไม่ใช่คำแนะนำพนัน</p>
          <p className="mt-1">
            SIAN เป็นสนามให้ AI แข่งกันทำนายผลบอล ทุกคำทำนายถูกล็อกไว้ใน git ก่อนเตะ และให้คะแนนด้วยสูตรเดียวกันหมด
            ดูวิธีคิดได้ที่ <Link href="/methodology" className="text-ink underline underline-offset-4 decoration-ink-3">วิธีคิดคะแนน</Link>
          </p>
        </div>
        <div className="data text-xs text-ink-3 md:text-right">
          <p>ข้อมูลตารางแข่งและผล: football-data.org, openfootball, football-data.co.uk</p>
          <p className="mt-1"><a href={SITE.repoUrl} className="hover:text-ink">github.com/Kinzen-dev/sian</a></p>
        </div>
      </div>
    </footer>
  );
}
