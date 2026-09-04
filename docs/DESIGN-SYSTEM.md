# SIAN design system

Recorded from the built code, not from intention. Ground truth is `src/app/globals.css`, `src/components/fx/*`, `src/lib/copy.ts`, `src/lib/site.ts`, `src/lib/club-colours.ts`. Every new surface on SIAN follows this document; the checklist at the end is the gate.

## Thesis

The particle field is the material, not a background. Gold dust in club colours forms the things the page is about (two TLAs, a scoreline, a probability cloud, a Thai word) and the DOM sits on top of it as a legible ledger. The shell is broadcast dark (Sky Sports, F1 TV); the data surfaces are terminal dense (Bloomberg, FiveThirtyEight). Thai first: every label a football fan reads without a glossary, English only for proper nouns and stat names.

The techniques come from ละอองทอง (`/Users/triok.t/Projects/laong-thong/docs/TECHNIQUES.md` has the maths, code anchors and traps). SIAN keeps its own palette and type; it borrows the physics and the rendering rules.

## Tokens

Colours (`:root` in `globals.css`, exposed to Tailwind through `@theme inline` as `bg-canvas`, `text-ink-2`, `text-gold` and so on):

| Token | Value | Role |
|---|---|---|
| `--canvas` | `#060a0f` | page ground, particle ground (linearised in the engine) |
| `--sunken` / `--raised` / `--raised-2` | `#03060a` / `#0c1219` / `#121a24` | hero wells, cards, hover |
| `--rule` / `--rule-strong` | `#1a2331` / `#2b3646` | 1px compartments; `.cells` uses the rule colour as the grid gap |
| `--ink` / `--ink-2` / `--ink-3` | `#f2f4f7` / `#9aa5b4` / `#5e6a79` | text hierarchy: primary, secondary, tertiary |
| `--gold` | `#f2b431` | SIAN accent: logo, active state, draw share, focus of a leader moment |
| `--champ` | `#f6e3a1` | champagne: the hot end of every particle ramp, "right call" tint, leader row wash |
| `--verm` | `#c8402a` | vermilion: one meaning only, "against" (wrong call, disagreement hairline, split marker) |
| `--hazard` | `#ff3b3b` | postponed / off states in DOM text |
| `--draw` | `#3a4453` | draw pick dot in DOM chips (particles use gold for draws) |

Club colours live in `TEAM_COLOR` (`src/lib/site.ts`), one primary per club tuned to read on the night canvas; `CLUB_SECONDARY` in `src/lib/club-colours.ts`. Any colour that reaches the particle engine passes through `hdrColour()`, which clamps whites to champagne and blacks to shadow gold so no particle is ever pure white or invisible. Rules: no pure white particles; no second accent hue; vermilion never paints a surface, only a mark or a tint under 16%.

Type roles:

| Role | Face | Where |
|---|---|---|
| body / UI | IBM Plex Sans Thai 400/500/600 (`@fontsource`, self-hosted) | all Thai and mixed text; line-height 1.65; no italics anywhere (`font-synthesis: none`, `em, i { font-style: normal }`) |
| data | JetBrains Mono 400/600 (`.data`) | every numeric column, timestamps, hashes, percents; tabular figures |
| display | Barlow Condensed 600/700 (`.display`) | TLAs, scorelines, giant percents, counters. Latin only: it enters the page only through `<Numeral>` (`src/components/ui/Numeral.tsx`), which throws in dev on non-Latin text; Thai can never fall into it |

Sizes are tokens (`--text-xs` to `--text-2xl`, `--text-giant`). No letter-spacing on Thai. Thai containers never get fixed heights or `break-all`; `.thai-tight` keeps words whole.

Spacing and structure: `.shell` (max 84rem, fluid inline padding); `.cells` for 1px grid compartments; `.frame`, `.rule-t`, `.rule-b` for hairlines. No cards inside cards, no box shadows, no borders around whole content blocks.

## Motion

- One authored moment per page (the hero burst → TLAs → cloud on home; scoreline → cloud on a match page; the scroll-owned TLAs on the board). Everything else is the material moving: spring morphs, pointer forces, click pulses.
- DOM motion is transform and opacity only (`SectionHeading` hairline draw-in, `RollingNumber`, `.lift`, `.row-lift`, `PageFade` enter-only). No layout-property transitions. No exit animations (`AnimatePresence` exits are unreliable in the App Router).
- `prefers-reduced-motion`: the field settles straight into its final target with no burst, drift or pointer forces (`STAGE.still`, `ScrollField` `STILL`); hairlines render drawn; rolling numbers print their final value; CSS transitions are removed.
- Numbers are SSR-stable: the server prints the final value, the client only animates toward it, so there is no zero flash and no hydration diff.

## The field (FX rules)

Engine: `src/components/fx/engine.ts` (WebGL2 float-texture ping-pong sim, curl noise, spring to target, planar camera, HDR additive points, two-level bloom, hue-preserving composite with grain and edge mask, pointer repel, click pulses, adaptive quality). Shaders in `shaders.ts`; CPU target generators in `generators.ts`; React lifecycles in `ParticleField.tsx` (hero and match stage) and `ScrollField.tsx` (fixed, scroll-owned backdrop).

Which surface gets which field:

| Surface | Component | Opening | Resting target | Intensity |
|---|---|---|---|---|
| Home hero | `FieldStage` | burst → two TLAs in club colours (1.2 s) → hold 3 s | probability cloud of the lead guru; chips re-morph | 0.048 text / 0.066 cloud |
| Match page | `FieldStage` | burst → predicted scoreline (or real score after FT: champagne right, vermilion wrong) | probability cloud | same as hero |
| Predictions board | `BoardField` + `ScrollField` | burst → page word | the row nearest the viewport centre owns the field: its two TLAs; no row centred → the Thai page word | 0.036 calm, 0.03 while scrolling, fade 0.85 |
| Everything else | none | CSS only | | |

Generators: `genTwoTlas` (display face, club colours), `genScoreline`, `genThaiWord` (IBM Plex Sans Thai 600, gold ramp), `genProbabilityCloud` (three masses sized by H/D/A, home colour / gold / away colour), `genDust`, `genBurstSeed`. Text generators rasterise into an offscreen canvas and sample glyph pixels with 30 to 40% from edges so thin strokes stay crisp; Thai is safe because `fillText` handles combining marks and the font is loaded first (`document.fonts.load`).

Performance budget (verified on the real GPU with headless Chromium + ANGLE Metal):

- Grid 1024² on fine pointers, 512² on coarse pointers (`pickSide`); adaptive downgrade 1024 → 768 → 512 → 256 when fps stays under 38.
- Frame time 8.3 ms at 120 fps on Apple silicon for both sides; the sim is the smaller half.
- Pause when `document.hidden`, when the host is not intersecting (stage fields), when scrolled out (`scrollFade`). The fixed board field pauses on hidden only.
- Mount after hydration via `requestIdleCallback` (timeout 1.2 s) through `next/dynamic` with `ssr: false`; the DOM opening text is server-rendered so LCP is text (measured 160 to 1220 ms) and CLS stays under 0.01.
- Fallback: `?fx=off`, no WebGL2, or no float colour buffers → the CSS haze stays and the DOM opening remains visible. Never a blank stage.
- Chunk budget: engine + stage + generators about 21 KB gzipped; keep the total under 40 KB.
- Legibility: DOM above the canvas (`.fx-ui`, `.board`), `pointer-events: none` on the layer except real controls; the ledger rows sit on a 66% canvas tint so text stays readable over bright bands.

Tuning constants live in `STAGE` (`FieldStage.tsx`) and `CALM` / `MOVING` / `STILL` (`ScrollField.tsx`). Change intensity first when the look changes; it is normalised for particle count and distance in the engine.

## Copy

- Plain Thai a fan reads instantly; one-line explainer under every section header (`SectionHeading` `explainer`); a "อ่านยังไง" list where a page introduces numbers (`HowToRead`).
- Every string lives in `src/lib/copy.ts` (`COPY.<page>.*`), glossary in `GLOSSARY`, baseline naming in `BASELINES` and `BASELINE_PREFIX`. Baselines are always framed as "สูตรง่ายๆ ไว้เทียบ (ไม่ใช่ AI)", never as gurus.
- Proper nouns and stat names in English (xG, Brier, TLAs); jargon glossed once per page (`Term`).
- Dates: Gregorian, `Asia/Bangkok`, formatted on the server only (`src/lib/format.ts`), "น." suffix. Never `th-TH` without `calendar: "gregory"` (it would print 2569).
- No em dashes, no en dashes except numeric ranges. No betting advice, no odds as prices: the market appears only as a percentage.
- Empty states are warm and specific: what will appear and when.

## Component inventory

| Component | Path | Used on |
|---|---|---|
| `SiteHeader`, `NavLinks`, `SiteFooter` | `components/nav`, `components/layout` | every page |
| `SectionHeading` | `components/ui` | every section header (hairline draw-in) |
| `Numeral` | `components/ui` | every display-face string |
| `RollingNumber` | `components/ui` | headline stats (guru, leaderboard, team) |
| `Term`, `HowToRead` | `components/ui` | glossed terms and reading guides |
| `PageFade` | `components/ui` | enter-only route fade |
| `Crest`, `TeamMark` | `components/team` | club marks everywhere |
| `PickChip`, `ProbabilityBar` | `components/match` | picks and probability bars in cards |
| `RoundMatchRow` | `components/layout` | gameweek, team, home round lists |
| `LeaderboardTable` | `components/leaderboard` | leaderboard, home snapshot |
| `RunStatusPanel` | `components/status` | home |
| `BroadcastHero` → `FieldStage` | `components/hero`, `components/fx` | home hero, match stage |
| `PredictionsBoard`, `BoardField`, `ScrollField` | `components/board`, `components/fx` | predictions board |
| `CalibrationChart`, `FormSparkline` | `components/charts` | guru page |

Data layer: `src/lib/schema` (zod contract) → `src/lib/load.ts` (`server-only`, reads every leaf once) → `src/lib/aggregate.ts` (pure) → `src/lib/view.ts` / `src/lib/board.ts` (view models). Client components receive primitives and small view models only; a CI grep of `.next/static` for a guru id proves no raw data leaks.

## New surface checklist

1. Server-rendered, `generateStaticParams` from index files only, no `searchParams`, no cookies.
2. Every heading through `SectionHeading` with a one-line Thai explainer; strings in `copy.ts`.
3. Display face only through `Numeral`; numbers in `.data`; Thai never in the display face.
4. Dates formatted on the server with Gregorian calendar and Asia/Bangkok.
5. If the page gets a field: choose the generator from the table above, mount after idle, keep the DOM opening, honour reduced motion, verify the fallback with `?fx=off`.
6. Baselines labelled with `BASELINES[id].short` and framed as formulas, never as gurus.
7. Vermilion only for "against"; champagne only for "right" or "leader"; gold for SIAN and draws.
8. 390, 768 and 1440 screenshots through the qa-harness; `vlint` 0; tone marks unclipped at 390; tables scroll inside their container or collapse to cards.
9. GPU probe on any page with a field: fps, frame ms, LCP element is text, CLS under 0.01, console errors 0.
10. `npm run check` and `npm run build` green; no analysis text or sources in `.next/static`.

## What not to do

- No particle colours outside club colours, gold, champagne, shadow gold and 1 to 2% vermilion sparks. No cyan, no neon, no white.
- No second field on a page; no field on data-only pages (leaderboard, guru, rules).
- No cards inside cards, no glow shadows on DOM text (the particles are the light), no monospace as a costume outside numeric columns.
- No kicker labels above headings; no uppercase Thai.
- No layout-property transitions, no exit animations, no motion that blocks reading.
- No hand-written dates, no `th-TH` Buddhist years, no prices, no betting language.
