import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "./store";

// Minimal .env loader (no dependency). Real env always wins.
export function loadEnv(): void {
  const p = join(rootDir(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}
