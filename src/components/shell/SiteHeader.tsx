import Link from "next/link";
import { NAV, SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="rule-b bg-canvas/95 backdrop-blur sticky top-0 z-20">
      <div className="shell flex items-center gap-6 h-14">
        <Link href="/" className="flex items-baseline gap-2 hover:no-underline">
          <span className="display text-[1.75rem] text-gold leading-none">{SITE.name}</span>
          <span className="text-sm text-ink-2">{SITE.nameTh}</span>
        </Link>
        <nav aria-label="เมนูหลัก" className="ml-auto flex items-center gap-4 sm:gap-6 text-sm">
          {NAV.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className="text-ink-2 hover:text-ink whitespace-nowrap">{n.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
