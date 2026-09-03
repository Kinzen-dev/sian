import Link from "next/link";
import { SITE } from "@/lib/site";
import { COPY } from "@/lib/copy";
import { NavLinks } from "@/components/nav/NavLinks";

export function SiteHeader() {
  return (
    <header className="rule-b bg-canvas/95 backdrop-blur sticky top-0 z-20">
      <div className="shell flex items-center gap-6 h-14">
        <Link href="/" className="flex items-baseline gap-2 hover:no-underline" aria-label={`${SITE.name} ${COPY.nav.home}`}>
          <span className="display text-[1.75rem] text-gold leading-none">{SITE.name}</span>
          <span className="text-sm text-ink-2">{SITE.nameTh}</span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
