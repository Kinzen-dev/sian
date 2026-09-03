import type { TeamView } from "@/lib/view";
import { Numeral } from "@/components/ui/Numeral";

export function Crest({ team, size = 28 }: { team: TeamView; size?: number }) {
  if (!team.crestUrl) {
    return (
      <span aria-hidden className="inline-flex items-center justify-center frame" style={{ width: size, height: size, borderColor: team.color }}>
        <Numeral className="text-[0.7em] leading-none" >{team.tla}</Numeral>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={team.crestUrl} alt="" width={size} height={size} loading="lazy" decoding="async" style={{ width: size, height: size, objectFit: "contain" }} />;
}

export function TeamMark({ team, align = "left", size = 24 }: { team: TeamView; align?: "left" | "right"; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Crest team={team} size={size} />
      <span className="min-w-0">
        <Numeral className="text-lg leading-none block">{team.tla}</Numeral>
        <span className="block text-xs text-ink-2 truncate">{team.nameTh}</span>
      </span>
    </span>
  );
}
