import { existsSync } from "node:fs";
import { join } from "node:path";
import { GuruProfile } from "@/lib/schema";
import { dataDir, readJson, writeJson } from "./store";

export function guruDir(guruId: string): string {
  return join(dataDir(), "gurus", guruId);
}

export function loadGuru(guruId: string): GuruProfile | null {
  const p = join(guruDir(guruId), "profile.json");
  return existsSync(p) ? GuruProfile.parse(readJson(p)) : null;
}

export function ensureGuru(profile: GuruProfile): GuruProfile {
  const existing = loadGuru(profile.guruId);
  if (existing) {
    const harnesses = [...new Set([...existing.harnesses, ...profile.harnesses])];
    const merged = { ...existing, harnesses };
    if (harnesses.length !== existing.harnesses.length) writeJson(join(guruDir(profile.guruId), "profile.json"), merged);
    return merged;
  }
  writeJson(join(guruDir(profile.guruId), "profile.json"), profile);
  return profile;
}

export function predictionPath(guruId: string, matchId: string): string {
  return join(dataDir(), "predictions", guruId, `${matchId}.json`);
}
