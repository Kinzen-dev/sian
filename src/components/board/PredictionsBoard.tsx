import Link from "next/link";
import type { Competition, GuruProfile } from "@/lib/schema";
import { getWorld, teamView, type TeamView } from "@/lib/view";
import { buildBoard, guruShort, type BoardMatch, type BoardCell } from "@/lib/board";
import { BASELINES, COPY } from "@/lib/copy";
import { COMPETITION_LABEL, roundLabel } from "@/lib/site";
import { dateRange, fmtKickoff, pct } from "@/lib/format";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HowToRead } from "@/components/ui/Term";
import { BoardField } from "@/components/fx/BoardField";

const B = COPY.board;

export async function PredictionsBoard({ comp }: { comp: Competition | null }) {
  const w = await getWorld();
  const board = buildBoard({ fixtures: w.fixtures, predictions: w.predictions, scores: w.scores, factpacks: new Set(w.factpacks.keys()), gurus: w.gurus, now: w.builtAt }, comp ?? undefined);
  const team = (id: string): TeamView => teamView(w.teams.get(id)!);
  const total = board.rounds.reduce((n, r) => n + r.matches.filter((m) => !m.waiting).length, 0);
  const filters: { href: string; label: string; on: boolean }[] = [
    { href: "/predictions", label: B.filterAll, on: comp === null },
    { href: "/predictions/epl", label: COMPETITION_LABEL.epl.th, on: comp === "epl" },
    { href: "/predictions/ucl", label: COMPETITION_LABEL.ucl.th, on: comp === "ucl" },
  ];
  return (
    <>
      <BoardField word={B.title} />
      <main className="board shell mt-8 pb-16">
        <SectionHeading as="h1" className="board-head" title={B.title} explainer={B.lead} aside={B.matchesOf(total)} />
        <div className="board-head mt-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="เลือกรายการ" className="flex flex-wrap gap-2 text-sm">
            {filters.map((f) => (
              <Link key={f.href} href={f.href} aria-current={f.on ? "page" : undefined} className={`frame px-3 py-1 hover:no-underline ${f.on ? "text-ink border-gold" : "text-ink-2 hover:text-ink"}`} style={f.on ? { borderColor: "var(--gold)" } : undefined}>{f.label}</Link>
            ))}
          </nav>
          {board.baselines.length > 0 && (
            <label className="board-toggle-label" title={B.toggleHint}>
              <input type="checkbox" className="board-toggle" />
              <span>{B.toggleBaselines}</span>
            </label>
          )}
        </div>
        <p className="board-head m-0 mt-3 text-sm text-ink-2 thai-tight max-w-[80ch]">{B.howTo}</p>

        {board.rounds.length === 0 && <p className="mt-10 text-ink-2 thai-tight max-w-[60ch]">{B.empty}</p>}

        {board.rounds.map((r) => (
          <section key={`${r.competition}-${r.round}`} className="mt-10">
            <SectionHeading
              className="board-head"
              title={`${COMPETITION_LABEL[r.competition].th} ${roundLabel(r.competition, r.round)}`}
              aside={`${dateRange(r.kickoffs)} · ${r.phase === "finished" ? B.finished : B.upcoming}`}
            />
            <table className="board-table mt-3">
              <thead>
                <tr>
                  <th scope="col" className="board-when">{B.colWhen}</th>
                  <th scope="col" className="board-teams">{B.colMatch}</th>
                  {board.models.map((g) => <GuruHead key={g.guruId} g={g} />)}
                  {board.baselines.map((g) => <GuruHead key={g.guruId} g={g} base />)}
                </tr>
              </thead>
              <tbody>
                {r.matches.map((m) => <BoardRow key={m.matchId} m={m} home={team(m.homeTeamId)} away={team(m.awayTeamId)} models={board.models} baselines={board.baselines} />)}
              </tbody>
            </table>
          </section>
        ))}

        <p className="m-0 mt-8 text-xs text-ink-3 thai-tight">{B.fieldHint}</p>
        <div className="mt-6"><HowToRead keys={["probs", "confidence", "baseline", "lock", "upset"]} /></div>
      </main>
    </>
  );
}

function GuruHead({ g, base = false }: { g: GuruProfile; base?: boolean }) {
  const label = base ? BASELINES[g.guruId]?.short ?? g.displayName : g.displayName;
  return (
    <th scope="col" className={`board-cell ${base ? "board-base" : ""}`} title={base ? BASELINES[g.guruId]?.line : g.modelId}>
      <Link href={`/guru/${g.guruId}`} className="hover:no-underline">
        <span className="block">{label}</span>
        {!base && <span className="data block text-[0.65rem] text-ink-3 normal-case">{g.modelId}</span>}
      </Link>
    </th>
  );
}

function BoardRow({ m, home, away, models, baselines }: { m: BoardMatch; home: TeamView; away: TeamView; models: GuruProfile[]; baselines: GuruProfile[] }) {
  const finished = m.state === "finished";
  const when = finished ? B.finished : m.state === "live" ? <span className="text-gold">{B.live}</span> : m.state === "off" ? <span className="text-hazard">{B.off}</span> : fmtKickoff(m.kickoffUtc);
  const cols = 2 + models.length + baselines.length;
  return (
    <tr className={`board-match board-${m.state} ${m.split ? "board-split" : ""}`} data-board-row data-match={m.matchId} data-home-tla={home.tla} data-away-tla={away.tla} data-home-color={home.color} data-away-color={away.color}>
      <td className="board-when data">{when}</td>
      <td className="board-teams">
        <Link href={`/match/${m.matchId}`} className="hover:no-underline">
          <span className="flex items-center justify-end gap-2 min-w-0">
            <span className="text-xs text-ink-2 truncate hidden lg:inline max-w-[8rem]">{home.nameTh}</span>
            <Numeral className="text-xl">{home.tla}</Numeral>
            <Crest team={home} size={22} />
          </span>
          <span className="text-center min-w-[3.6rem]">
            {m.score ? <Numeral className="board-real text-xl" >{`${m.score.home}-${m.score.away}`}</Numeral> : <Numeral className="text-ink-3 text-lg">v</Numeral>}
            {m.split && <span className="board-tag" title={B.splitTip}>{B.split}</span>}
          </span>
          <span className="flex items-center gap-2 min-w-0">
            <Crest team={away} size={22} />
            <Numeral className="text-xl">{away.tla}</Numeral>
            <span className="text-xs text-ink-2 truncate hidden lg:inline max-w-[8rem]">{away.nameTh}</span>
          </span>
        </Link>
      </td>
      {m.waiting ? (
        <td className="board-wait text-sm text-ink-3 thai-tight" colSpan={cols - 2}>{B.waiting}</td>
      ) : (
        <>
          {models.map((g) => <Cell key={g.guruId} g={g} cell={m.cells[g.guruId]} home={home} away={away} finished={finished} />)}
          {baselines.map((g) => <Cell key={g.guruId} g={g} cell={m.cells[g.guruId]} home={home} away={away} finished={finished} base />)}
        </>
      )}
    </tr>
  );
}

function Cell({ g, cell, home, away, finished, base = false }: { g: GuruProfile; cell: BoardCell | undefined; home: TeamView; away: TeamView; finished: boolean; base?: boolean }) {
  const label = base ? BASELINES[g.guruId]?.short ?? g.displayName : guruShort(g.displayName);
  if (!cell) {
    return <td className={`board-cell ${base ? "board-base" : ""}`}><span className="board-cell-label">{label}</span><span className="text-ink-3 text-xs">{B.noCall}</span></td>;
  }
  const color = cell.pick === "H" ? home.color : cell.pick === "A" ? away.color : "var(--gold)";
  const text = cell.scoreline ? `${cell.scoreline.home}-${cell.scoreline.away}` : cell.pick === "H" ? home.tla : cell.pick === "A" ? away.tla : "DRAW";
  const verdict = finished && cell.correct !== null ? (cell.correct ? "board-hit" : "board-miss") : "";
  const aria = `${label} ทาย ${cell.pick === "H" ? home.nameTh : cell.pick === "A" ? away.nameTh : "เสมอ"}${cell.scoreline ? ` ${cell.scoreline.home}-${cell.scoreline.away}` : ""} มั่นใจ ${pct(cell.maxProb)}`;
  return (
    <td className={`board-cell ${base ? "board-base" : ""} ${verdict}`} aria-label={aria}>
      <span className="board-cell-label">{label}</span>
      <span className="board-pick" style={{ background: color }} aria-hidden />
      <Numeral className="board-score">{text}</Numeral>
      <span className="board-prob data">{pct(cell.maxProb)}</span>
      {cell.points !== null && <span className={`board-pts data ${cell.correct ? "text-champ" : "text-ink-3"}`}>{`+${cell.points.toFixed(1)}`}</span>}
      {cell.void && <span className="board-flag">{B.voidTag}</span>}
      {!cell.void && cell.late && <span className="board-flag">{B.lateTag}</span>}
    </td>
  );
}
