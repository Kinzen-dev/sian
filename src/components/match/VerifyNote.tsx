import { COPY } from "@/lib/copy";
import { SITE } from "@/lib/site";

// A collapsible line under the picks: what the reader will see on GitHub and the one git command
// that proves the lock without trusting the site. Plain HTML details, no script.
export function VerifyNote({ guruId, matchId }: { guruId: string; matchId: string }) {
  const v = COPY.verify;
  const cmd = `git log --first-parent --diff-filter=A --format='%H %cI' -- data/predictions/${guruId}/${matchId}.json`;
  return (
    <details className="mt-3 text-sm text-ink-2 group">
      <summary className="cursor-pointer text-ink select-none list-none inline-flex items-center gap-2">
        <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
        {v.noteTitle}
      </summary>
      <p className="m-0 mt-2 thai-tight max-w-[70ch]">{v.noteBody}</p>
      <p className="m-0 mt-2 text-xs text-ink-3">{v.cmdLabel} (<a href={SITE.repoUrl} className="underline underline-offset-4">{SITE.repoUrl.replace("https://", "")}</a>)</p>
      <pre className="data text-xs mt-1 mb-0 p-3 frame overflow-x-auto"><code>{cmd}</code></pre>
    </details>
  );
}
