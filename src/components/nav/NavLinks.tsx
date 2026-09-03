"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COPY } from "@/lib/copy";

const LINKS = [
  { href: "/leaderboard", label: COPY.nav.leaderboard },
  { href: "/methodology", label: COPY.nav.rules },
  { href: "/team/man-utd", label: COPY.nav.manutd },
];

// The current section is underlined in gold; everything else stays quiet.
export function NavLinks() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label={COPY.nav.menu} className="ml-auto flex items-center gap-4 sm:gap-6 text-sm">
      {LINKS.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap hover:no-underline ${active ? "text-ink underline underline-offset-[0.45em] decoration-gold" : "text-ink-2 hover:text-ink"}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
