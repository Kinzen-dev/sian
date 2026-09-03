import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "@/lib/site";

// generateStaticParams reads index files only; never the whole world.
const DATA = join(process.cwd(), "data");

function fixtureIds(comp: string): { matchId: string; round: number }[] {
  const p = join(DATA, "competitions", comp, SITE.seasonLabel, "fixtures.json");
  if (!existsSync(p)) return [];
  const j = JSON.parse(readFileSync(p, "utf8")) as { fixtures: { matchId: string; round: number }[] };
  return j.fixtures.map((f) => ({ matchId: f.matchId, round: f.round }));
}

export function matchParams(): { id: string }[] {
  return ["epl", "ucl"].flatMap((c) => fixtureIds(c).map((f) => ({ id: f.matchId })));
}

export function roundParams(): { comp: string; round: string }[] {
  return ["epl", "ucl"].flatMap((c) => [...new Set(fixtureIds(c).map((f) => f.round))].map((r) => ({ comp: c, round: String(r) })));
}

export function guruParams(): { id: string }[] {
  const dir = join(DATA, "gurus");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "profile.json"))).map((d) => ({ id: d.name }));
}

export function teamParams(): { slug: string }[] {
  return SITE.featuredTeams.map((slug) => ({ slug }));
}
