#!/usr/bin/env bash
# Opens the two free signup pages, captures the keys, writes .env, and offers to push them to GitHub Actions.
set -euo pipefail
cd "$(dirname "$0")/.."
open_url() { if command -v open >/dev/null; then open "$1"; else echo "open: $1"; fi; }

echo "1/2 football-data.org (free tier, email only). Copy the token from the confirmation email."
open_url "https://www.football-data.org/client/register"
read -r -p "FOOTBALL_DATA_TOKEN: " FD
echo "2/2 The Odds API (free 500 credits/month)."
open_url "https://the-odds-api.com/#get-access"
read -r -p "ODDS_API_KEY: " ODDS

{
  echo "FOOTBALL_DATA_TOKEN=${FD}"
  echo "ODDS_API_KEY=${ODDS}"
} > .env
echo "wrote .env"

read -r -p "Push both to GitHub Actions secrets now? [y/N] " yn
if [[ "${yn:-N}" =~ ^[Yy]$ ]]; then
  gh secret set -f .env
  echo "secrets set. Trigger the bot: gh workflow run refresh-and-score.yml"
fi
