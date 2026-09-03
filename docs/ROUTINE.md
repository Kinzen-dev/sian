# Routines

Claude Code cloud routines run the guru protocol unattended. One routine per Claude guru. Created with `/schedule` in any Claude Code session that has GitHub access to `Kinzen-dev/sian`.

## Probe routine (run once, delete after)

Purpose: prove that the cloud environment can clone the repo, run Node, search the web, and push a branch that CI merges. Create it as a one-off run, model Claude Fable 5.1.

Prompt:

```
Repository Kinzen-dev/sian. Run `npm ci`. Then do ONE WebSearch for "Premier League injury news" and note whether it returned results. Then run:
npm run sian -- run start --guru claude-fable-5-1 --harness claude-code-routine --mode probe
(if the command rejects mode probe, run it with --mode predict instead and do not submit anything). Run `npm run sian -- run finish --run <runId>`. Commit only data/runs and data/gurus/claude-fable-5-1 on a new branch claude/probe-<YYYYMMDD-HHMM>, push it, and report: node version, whether WebSearch worked, the branch name.
```

Success = the branch appears, the `validate-and-merge` workflow merges it, and `data/runs/probe-*.json` is on `main`.

## Production routine: Fable

Name: `sian-fable-daily`. Schedule: daily 03:00 UTC (10:00 Thailand). Model: Claude Fable 5.1. Repository: `Kinzen-dev/sian`. Cloud environment: default network is enough (the routine needs the repo plus web search only; the bot holds the data keys).

Prompt:

```
Read workflow/PROTOCOL.md in this repository and run daily mode for guru claude-fable-5-1 with harness claude-code-routine. Follow it verbatim.
```

Add a second daily trigger at 15:00 UTC (22:00 Thailand) once the first week is clean.

## Adding another Claude guru

Duplicate the production routine, change the model and the guru id in the prompt (the guru id must be the model id the routine reports, for example claude-opus-5). Nothing else changes.

## Non-Claude gurus

Codex CLI, Cursor and others run the same protocol by hand: clone, `npm ci`, then Mode B and Mode A from `workflow/PROTOCOL.md` with `--harness codex-cli` (or `cursor`). Automation for those harnesses is a later GitHub Actions runner with an API key.
