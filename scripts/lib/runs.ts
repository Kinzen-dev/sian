import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { Run } from "@/lib/schema";
import { rootDir } from "./store";

export const RunState = Run.extend({ model: z.object({ id: z.string(), displayName: z.string() }), windowHours: z.number() });
export type RunState = z.infer<typeof RunState>;

function stateDir(): string {
  const d = join(rootDir(), ".sian");
  mkdirSync(d, { recursive: true });
  return d;
}

export function runStatePath(runId: string): string {
  return join(stateDir(), `run-${runId}.json`);
}

export function loadRunState(runId: string): RunState {
  const p = runStatePath(runId);
  if (!existsSync(p)) throw new Error(`unknown run ${runId} (did you call \`sian run start\`?)`);
  return RunState.parse(JSON.parse(readFileSync(p, "utf8")));
}

export function saveRunState(state: RunState): void {
  writeFileSync(runStatePath(state.runId), JSON.stringify(state, null, 2) + "\n");
}

export function makeRunId(mode: string, guruId: string, now: string): string {
  return `${mode}-${now.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${guruId}`;
}

// Friendly names for known model IDs; anything else is title-cased on first sight.
const KNOWN: Record<string, string> = {
  "claude-fable-5-1": "Claude Fable 5.1",
  "claude-opus-5": "Claude Opus 5",
  "claude-sonnet-5": "Claude Sonnet 5",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
};
export function displayNameFor(modelId: string): string {
  return KNOWN[modelId] ?? modelId.split(/[-_.]/).map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}
