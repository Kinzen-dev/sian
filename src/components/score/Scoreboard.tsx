import { fmtKickoff, fmtTime, fmtUk } from "@/lib/format";
import type { MatchView } from "@/lib/view";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";

// Broadcast scoreboard. Scoreline in the display face; state word in Thai.
export function Scoreboard({ m, size = "md" }: { m: MatchView; size?: "md" | "lg" }) {
  const f = m.fixture;
  const big = size === "lg";
  const score = f.score ? `${f.score.home}-${f.score.away}` : null;
  const state = m.state === "finished" ? "จบเกม" : m.state === "live" ? "กำลังแข่ง" : m.state === "off" ? "เลื่อน" : big ? fmtKickoff(f.kickoffUtc) : `${fmtTime(f.kickoffUtc)} น.`;
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${big ? "gap-2 sm:gap-6" : "gap-3 sm:gap-6"}`}>
      <Side team={m.home} big={big} align="right" />
      <div className={`text-center ${big ? "min-w-[4.5rem] sm:min-w-[7rem]" : "min-w-[5.5rem]"}`}>
        {score ? (
          <Numeral className={big ? "text-[clamp(3rem,10vw,6rem)]" : "text-3xl"}>{score}</Numeral>
        ) : (
          <Numeral className={`${big ? "text-[clamp(2.5rem,8vw,5rem)]" : "text-3xl"} text-ink-3`}>v</Numeral>
        )}
        <div className={`mt-1 ${big ? "text-sm" : "text-xs"} text-ink-2 ${big ? "" : "whitespace-nowrap"}`}>{state}</div>
        {m.state === "upcoming" && big && <div className="data text-xs text-ink-3">{fmtUk(f.kickoffUtc)}</div>}
      </div>
      <Side team={m.away} big={big} align="left" />
    </div>
  );
}

function Side({ team, big, align }: { team: MatchView["home"]; big: boolean; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${big ? "flex-col sm:flex-row" : ""} ${align === "right" ? (big ? "sm:flex-row-reverse sm:text-right" : "flex-row-reverse text-right") : ""} ${big ? "text-center sm:text-left" : ""}`}>
      <Crest team={team} size={big ? 56 : 32} />
      <div className="min-w-0 w-full">
        <Numeral className={`block ${big ? "text-[clamp(2.25rem,9vw,4.5rem)]" : "text-2xl"}`}>{team.tla}</Numeral>
        <div className={`text-ink-2 ${big ? "text-sm sm:text-base" : "text-xs truncate"}`}>{team.nameTh}</div>
      </div>
    </div>
  );
}
