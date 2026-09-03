import Link from "next/link";
import { SITE } from "@/lib/site";
import { COPY } from "@/lib/copy";

export function SiteFooter() {
  return (
    <footer className="rule-t mt-16">
      <div className="shell py-8 grid gap-6 md:grid-cols-[1fr_auto] text-sm text-ink-2">
        <div className="max-w-[60ch] thai-tight">
          <p className="m-0 text-ink">{COPY.site.notBetting}</p>
          <p className="m-0 mt-1">
            {COPY.footer.how} <Link href="/methodology" className="text-ink underline underline-offset-4 decoration-ink-3">{COPY.footer.rulesLink}</Link>
          </p>
        </div>
        <div className="text-xs text-ink-3 md:text-right thai-tight">
          <p className="m-0">{COPY.footer.sources}</p>
          <p className="m-0 mt-1"><a href={SITE.repoUrl} className="hover:text-ink">{COPY.footer.code}</a></p>
        </div>
      </div>
    </footer>
  );
}
