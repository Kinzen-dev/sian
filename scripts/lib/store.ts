import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function rootDir(): string {
  return process.env.SIAN_ROOT ?? process.cwd();
}
export function dataDir(): string {
  return join(rootDir(), "data");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function readJsonIfExists<T>(path: string): T | null {
  return existsSync(path) ? readJson<T>(path) : null;
}

// Deterministic bytes: sorted keys, 2-space indent, trailing newline. Same input, same file, same hash.
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalJson(value));
}

// Write-once files (fact packs, predictions). Returns false when the file already exists.
export function writeJsonOnce(path: string, value: unknown): boolean {
  if (existsSync(path)) return false;
  writeJson(path, value);
  return true;
}

export function sha256(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]));
  }
  return value;
}

export function fixturesPath(competition: string, seasonLabel: string): string {
  return join(dataDir(), "competitions", competition, seasonLabel, "fixtures.json");
}
export const SEASON = "2627";
export const SEASON_LABEL = "2026-27";
