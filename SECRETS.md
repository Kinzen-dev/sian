# Secrets

Two free keys, both optional for the site and required for the bot to reach official data.

| Priority | Key | Where | Used by |
|---|---|---|---|
| High | `FOOTBALL_DATA_TOKEN` | https://www.football-data.org/client/register (email, free tier) | `refresh` (official fixtures, results, standings for PL + CL) |
| Medium | `ODDS_API_KEY` | https://the-odds-api.com/#get-access (free 500 credits/month) | `factpack` (market probabilities), enables `baseline-market` |

Local: `scripts/setup-keys.sh` opens both pages and writes `.env`.
GitHub Actions: `gh secret set -f .env` from the repo root.
Claude Code routine: not needed; routines only read fact packs the bot committed.

```
FOOTBALL_DATA_TOKEN=
ODDS_API_KEY=
```

## Growth and cross-vendor (added 2026-09-04)

| Priority | Key | Where | Used by |
|---|---|---|---|
| Medium | `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers console → your SIAN OA channel → Messaging API → channel access token (long-lived) | `notify` in `refresh-and-score` (results digest) and `validate-and-merge` (predictions digest). Without it both steps run as dry-run and only print. |
| Medium | `OPENAI_API_KEY` | https://platform.openai.com/api-keys | `guru-openai` workflow (`scripts/guru-runner.ts`). Without it the runner prints the pending list and exits 0. |

Optional repository variables (Settings → Variables): `OPENAI_GURU_MODEL` (default `gpt-5.6-sol`), `OPENAI_MAX_USD_PER_RUN` (default `5`).

```
LINE_CHANNEL_ACCESS_TOKEN=
OPENAI_API_KEY=
```

Set with `gh secret set LINE_CHANNEL_ACCESS_TOKEN` and `gh secret set OPENAI_API_KEY` (paste when prompted), or `gh secret set -f .env` after adding the lines above to `.env`.
