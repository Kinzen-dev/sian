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

## Probe result (2026-09-03 10:50 UTC, routine `sian-probe-once`)

- Clone, `npm ci`, the CLI, branch push and CI merge all worked end to end (branch `claude/probe-20260903-1050` merged by `validate-and-merge`).
- Cloud Node is v22 (the repo's `.nvmrc` is not honoured there); `engines` allows >=22.
- WebSearch works. WebFetch and curl to hosts outside the default allowlist are blocked by the egress proxy (`EGRESS_BLOCKED` for football-data.org, CONNECT 403 for the odds API). The routine does not need those hosts, but a guru's research step benefits from fetching club and news sites directly.

Human step (one minute): open the Default cloud environment at https://claude.ai/code (Environments), set Network access to **Full** (or Custom with `*.skysports.com`, `*.bbc.co.uk`, `*.theathletic.com`, `*.theguardian.com`, `*.premierleague.com`, `*.uefa.com`, `*.sportsmole.co.uk`, club domains). Until then the routine's research relies on WebSearch result snippets only.

## Live routines (created 2026-09-03)

| Name | ID | Schedule | Model | Status |
|---|---|---|---|---|
| sian-probe-once | trig_016P11vXFU5hsnKKjeWghn2B | one-off, fired 10:49 UTC | claude-fable-5-1 | deleted by King 2026-09-03 |
| sian-fable-daily | trig_01Sio8XRPEDCydpNj57BhNXc | `0 3 * * *` (10:00 Thailand) | claude-fable-5-1 | enabled; environment "Full" (env_01FCbgExJsxxx3dGPAisgbx4, network Full) since 2026-09-03 11:49 UTC |

Manage at https://claude.ai/code/routines. Debug a run from Claude Code with `/schedule` (list runs, run log).

| sian-opus-daily | trig_01BDJNbktHo2HNPwBec55VoD | `0 3 * * *` (10:00 Thailand) | claude-opus-5 | enabled; environment "Full"; first run fired manually 2026-09-03 15:16 UTC with `--window 96h` to cover MW3 |

## OpenAI guru via Actions (`guru-openai.yml`, added 2026-09-04)

Cross-vendor guru without waiting for Codex scheduling. `scripts/guru-runner.ts` runs `workflow/PROTOCOL.md` from code against the OpenAI Responses API with the built-in `web_search` tool, daily at 03:30 UTC (10:30 Thailand) and on `workflow_dispatch`.

- Guru id = the model id, default `gpt-5.6-sol` (GPT-5.6 Sol, $4 in / $20 out per 1M tokens; override with the repo variable `OPENAI_GURU_MODEL`, e.g. `gpt-6-astra` at $10 / $50). Harness `openai-api`; the profile is created on first run with display name "GPT-5.6 Sol".
- Mode B then Mode A exactly like the Claude routines: reviews for misses (one model call each), then one call per pending match with a strict JSON schema equal to `PredictionDraft`; a rejected draft is retried once with the validator's message appended; `submit` stamps the lock; the run pushes `guru/<model>-<stamp>` and CI merges.
- Cost guard `OPENAI_MAX_USD_PER_RUN` (default 5 USD) estimated from reported token usage plus $0.01 per search call; the runner stops submitting when exceeded and writes the reason into the run record.
- Expected cost: roughly 0.25 to 0.40 USD per match at medium reasoning (about 20 to 40k input tokens with search content, 3 to 6k output tokens, 3 to 5 searches), so an EPL round is about 3 to 4 USD and a full UCL matchday about 5 to 7 USD across three days.
- Dry-run: without `OPENAI_API_KEY` the workflow still runs green and only prints the pending list and the first prompt. Locally: `npx tsx scripts/guru-runner.ts --dry-run --window 96h`.

## LINE OA digests (`notify`, added 2026-09-04)

`npm run sian -- notify --event predictions|results [--dry-run]` composes Thai digests and broadcasts them through the LINE Messaging API (`POST /v2/bot/message/broadcast`) when `LINE_CHANNEL_ACCESS_TOKEN` is set; otherwise it prints them.

- Predictions digest: sent from `validate-and-merge` right after a guru branch merges, once per round the first time any model guru has predicted every fact-packed match of that round; when another guru completes later, an update digest lists every complete guru again. State in `data/notify/predictions-<round>.json` (committed to main by the workflow).
- Results digest: sent from `refresh-and-score` after scoring, at most one partial digest per UTC day while new scores arrive, plus one final digest when the round is fully scored. State in `data/notify/results-<round>.json`.
- Content: every match with each model guru's scoreline (⚡เห็นต่าง when they disagree) and the board link; results add the leader, points and hits per guru, the upset calls, the biggest miss, and the home-formula yardstick.
