import { parseArgs } from "node:util";
import { loadEnv } from "./lib/env";

loadEnv();

const [cmd, sub, ...rest] = process.argv.slice(2);
const isFlag = (s: string) => s.startsWith("--");
const args = sub && !isFlag(sub) ? rest : [sub, ...rest].filter(Boolean);
const subcommand = sub && !isFlag(sub) ? sub : undefined;

const { values } = parseArgs({
  args,
  options: {
    comp: { type: "string" }, window: { type: "string" }, since: { type: "string" }, guru: { type: "string" }, harness: { type: "string" },
    mode: { type: "string" }, "display-name": { type: "string" }, run: { type: "string" }, match: { type: "string" }, file: { type: "string" },
    text: { type: "string" }, base: { type: "string" }, "alert-window": { type: "string" }, now: { type: "string" },
  },
  strict: true,
});

const now = values.now ?? new Date().toISOString();
const hours = (s: string | undefined, d: number) => (s ? Number(s.replace(/h$/, "")) : d);

async function main(): Promise<number> {
  switch (cmd) {
    case "refresh": {
      const { refresh } = await import("./commands/refresh");
      const comps = (values.comp ?? "epl,ucl").split(",") as ("epl" | "ucl")[];
      const report = await refresh({ comps, now });
      const { writeReport } = await import("./commands/status");
      writeReport(report, now);
      return Object.values(report).some((r) => !r.ok && r.at) ? 2 : 0;
    }
    case "factpack": {
      const { factpack } = await import("./commands/factpack");
      await factpack({ windowHours: hours(values.window, 72), now });
      return 0;
    }
    case "baseline": {
      const { baseline } = await import("./commands/baseline");
      baseline({ now });
      return 0;
    }
    case "run": {
      const { runStart, runFinish } = await import("./commands/run");
      if (subcommand === "start") return runStart({ guru: values.guru, harness: values.harness, mode: values.mode, displayName: values["display-name"], now });
      if (subcommand === "finish") return runFinish({ run: values.run, now });
      throw new Error("usage: sian run start|finish");
    }
    case "submit": {
      const { submit } = await import("./commands/submit");
      return submit({ kind: subcommand, run: values.run, match: values.match, file: values.file, text: values.text, now });
    }
    case "validate": {
      const { validate } = await import("./commands/validate");
      return validate({ base: values.base ?? "origin/main" });
    }
    case "score": {
      const { score } = await import("./commands/score");
      score({ now });
      return 0;
    }
    case "locks": {
      const { locks } = await import("./commands/locks");
      locks({ now });
      return 0;
    }
    case "coverage": {
      const { coverage } = await import("./commands/coverage");
      return coverage({ alertWindowHours: hours(values["alert-window"], 12), now });
    }
    case "status": {
      const { status } = await import("./commands/status");
      status({ now });
      return 0;
    }
    default:
      console.error("usage: sian <refresh|factpack|baseline|run|submit|validate|score|locks|coverage|status> [--flags]");
      return 1;
  }
}

main().then((code) => process.exit(code)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
