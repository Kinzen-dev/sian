import { join } from "node:path";
import { Aliases, Team } from "@/lib/schema";
import { DATA, readJson } from "./store";
import { z } from "zod";

export type TeamIndex = {
  byId: Map<string, Team>;
  byTla: Map<string, Team>;
  resolve: (source: string, alias: string) => Team;
};

export function loadTeams(root = DATA): TeamIndex {
  const { teams } = z.object({ teams: z.array(Team) }).parse(readJson(join(root, "teams", "index.json")));
  const aliases = Aliases.parse(readJson(join(root, "teams", "aliases.json")));
  return buildTeamIndex(teams, aliases);
}

export function buildTeamIndex(teams: Team[], aliases: Aliases): TeamIndex {
  const byId = new Map(teams.map((t) => [t.teamId, t]));
  const byTla = new Map(teams.map((t) => [t.tla, t]));
  const resolve = (source: string, alias: string): Team => {
    const table = aliases[source];
    if (!table) throw new Error(`unknown alias source: ${source}`);
    const id = table[alias] ?? table[alias.trim()];
    const team = id ? byId.get(id) : undefined;
    if (!team) throw new Error(`unmatched team name for ${source}: "${alias}" (add it to data/teams/aliases.json)`);
    return team;
  };
  return { byId, byTla, resolve };
}
