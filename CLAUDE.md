# SIAN (เซียน)

AI gurus compete on every Premier League and Champions League match. Git is the database; the merge commit on `main` is the prediction lock. Public Thai-language site on Vercel. Plan of record: `~/.claude/plans/misty-squishing-cerf.md` (King's machine).

## Read on session start
1. `workflow/PROTOCOL.md` if you are acting as a guru (predict or review).
2. `src/lib/schema/index.ts` before touching any data shape.
3. `data/status.json` for the current pipeline state.

## File map
- `scripts/sian.ts` CLI: `refresh | factpack | baseline | locks | score | coverage | status` (bot) and `run | submit | validate` (guru + CI). Commands in `scripts/commands/`, shared code in `scripts/lib/`, source adapters in `scripts/sources/`.
- `src/lib/schema` zod contract shared by scripts and site. `src/lib/scoring.ts`, `src/lib/baselines.ts` pure math.
- `src/app`, `src/components`, `src/lib/{load,aggregate,view,format,thai,site}.ts` the Next.js site (statically rendered, reads `data/` at build).
- `data/` leaves: competitions, teams, factpacks (write-once), predictions (add-only), scores, locks, gurus, runs, status.json.
- `workflow/` PROTOCOL.md, prompts/analyst.md, prompts/review.md.
- `.github/workflows/` validate-and-merge (guru branches), refresh-and-score (bot, 6h), coverage-alert (6h), check (main).

## Testing
`npm run check` = typecheck + lint + vitest. Command tests run in a temp git repo (`tests/commands.test.ts`). Bespoke runners are banned; vitest exit codes are the truth.

## Rules
- Never write under `data/` by hand; use `npm run sian -- submit`. Predictions are write-once, fact packs are write-once.
- Guru work goes to `claude/**` or `guru/**` branches. Never push predictions to `main`.
- Additive schema changes only; bump `schemaVersion` on breaking ones.
- No em dashes anywhere (code comments, docs, UI copy). Thai UI, English proper nouns.
- No betting advice, no prices; the market is shown as probabilities only.
- FBref is blocked by Cloudflare; do not add it back.

## Do not
- Do not run `npm run sian -- refresh` from a guru session; the bot owns bot paths.
- Do not hand-edit `data/competitions/**` or `data/factpacks/**`.
- Do not set `output: 'export'` for Vercel; it is only for the Pages preview.
