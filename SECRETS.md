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
