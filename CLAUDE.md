# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this project is

**Briefing Trasfusionali** is a small, dependency-light Node.js agent that runs
once every morning (08:00 Europe/Rome) on **GitHub Actions**. Each run:

1. Collects news and institutional-act links about transfusion medicine
   (SIMT / servizi trasfusionali, officine trasfusionali, Centri Regionali
   Sangue, piani sangue, primary-physician appointments, public competitions,
   delibere) for three Italian regions: **Abruzzo, Molise, Marche**.
2. Filters against an anti-duplicate memory so only *new* items survive.
3. Uses **Claude** to write a short briefing per region.
4. Posts **one Telegram message per region** to a dedicated channel.
5. Commits the updated memory back to the repo.

There is no server and no database — GitHub Actions is the scheduler, a Telegram
channel is the delivery + notification surface, and a committed JSON file is the
memory. User-facing text (README, code comments, prompts, Telegram output) is in
**Italian**; keep that convention.

## Repository layout

```
src/                    ← THE ACTIVE CODE. Edit here.
  index.js              Entry point / orchestration (per package.json `start`)
  config.js             Env-var config + assertConfig() validation
  sources.js            REGIONS map, news queries, LINK_KEYWORDS — edit to add sources
  fetch.js              Google News RSS fetch + HTML link extraction + htmlToText
  summarize.js          Claude call (summarizeRegion) + summarizeForTelegram adapter
  state.js              Load/save/prune state/seen.json anti-duplicate memory
  telegram.js           sendTelegram() → Telegram Bot API
state/seen.json         Persistent memory (map of URL → ISO timestamp). Committed by CI.
.github/workflows/briefing.yml   The scheduled GitHub Actions workflow
README.md               End-user setup guide (Italian)
.env.example            Template for local env vars
index.js, summarize.js  ⚠ Root-level DUPLICATES — NOT run. See note below.
```

### ⚠ Important: the root-level `index.js` / `summarize.js` are stale duplicates

`package.json` runs `src/index.js` (`"start": "node src/index.js"`), and the
workflow calls `npm start`. The **root-level** `index.js` and `summarize.js` are
an older/variant copy that nothing imports or executes. They differ from the
`src/` versions (e.g. root uses `summarizeRegion` per region directly; `src/`
adds a `summarizeForTelegram` adapter). **Make changes in `src/` only.** Don't
assume the root files are current, and mention this ambiguity if a task seems to
target them — they are likely dead code that could be removed.

## Architecture / data flow

`src/index.js:main()` drives everything:

1. `assertConfig()` — fail fast if `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, or
   `TELEGRAM_CHAT_ID` are missing.
2. **Time guard** — the workflow fires two cron jobs (06:00 and 07:00 UTC) to
   cover Italian DST; `localHour()` checks the real Europe/Rome hour and exits
   unless it equals `TARGET_HOUR` (8). So only one of the two daily runs does
   real work. `BYPASS_TIME_GUARD=true` skips this (used for manual/test runs).
3. `gatherRegion()` per region: run each `newsQuery` through `getNews()` (Google
   News RSS) and each `linkSource` through `getLinks()` (HTML anchor extraction
   filtered by `LINK_KEYWORDS`), dedupe by link and normalized title, then keep
   only items not already in memory (`isNew`/`markSeen`).
4. Regions with new items → `summarizeRegion()` asks Claude to format the items
   (plain text, three lines per item). On any failure/empty response it falls
   back to `fallbackBlock()` (raw list). This per-region fallback means one bad
   region never blocks the others.
5. `sendTelegram()` posts one message per region (truncated to `maxMsgChars`,
   3900, under Telegram's 4096 limit).
6. `pruneState()` drops entries older than `MEMORY_DAYS`, then `saveState()`
   writes `state/seen.json`. **Memory is persisted only after posting**, and the
   workflow's final step commits it with `[skip ci]`.

Items are objects: `{ title, link, date, source, snippet, kind }` where `kind`
is `"news"` (📰) or `"atto/BUR"` (📄, higher priority in the prompt).

## Configuration (env vars → `src/config.js`)

| Var | Default | Purpose |
|-----|---------|---------|
| `ANTHROPIC_API_KEY` | — (required) | Claude API key (GitHub Secret) |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` | Model for summaries |
| `TELEGRAM_BOT_TOKEN` | — (required) | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | — (required) | `@channel` or `-100…` |
| `TIMEZONE` | `Europe/Rome` | Time-guard timezone |
| `TARGET_HOUR` | `8` | Local hour the run posts |
| `BYPASS_TIME_GUARD` | `false` | Skip the hour check (tests) |
| `NEWS_WINDOW` | `14` | Google News lookback (days) |
| `MEMORY_DAYS` | `60` | How long URLs stay in memory |
| `ALWAYS_POST` | `false` | If true, post "nessuna novità" on empty days |

Secrets/vars live in **GitHub → Settings → Secrets and variables → Actions**.
`ANTHROPIC_MODEL` is a repo *Variable*; the rest are *Secrets*.

## Development workflow

- **Node ≥ 20** (uses native global `fetch`, ESM `"type": "module"`). Only two
  runtime deps: `@anthropic-ai/sdk`, `rss-parser`.
- Install: `npm install`
- Local test run (skips the time guard): `npm run test:now`
  (equivalent to `BYPASS_TIME_GUARD=true node src/index.js`).
- Copy `.env.example` → `.env` and fill it for local runs. **Never commit
  `.env`** (git-ignored). A real run will actually post to Telegram and consume
  API credits — point `TELEGRAM_CHAT_ID` at a test channel while developing.
- There is **no test suite, linter, or build step**. Verify changes by reading
  the console logs of a run (each region logs `raccolti / unici / NUOVI`).

### To reset the memory / force a fresh full post
Set `state/seen.json` to `{ "items": {}, "lastRun": null }`. The next run then
treats everything as new (the first-ever run posts a lot).

## Common tasks

- **Add/modify a region or a source** → edit `src/sources.js` only
  (`REGIONS`, `newsQueries`, `linkSources`, `LINK_KEYWORDS`, the `KW` string).
- **Change the briefing wording/format** → edit the `SYSTEM` prompt in
  `src/summarize.js`. Keep the rules: plain text (no markdown/asterisks), the
  exact 3-line-per-item format, never return empty.
- **Change schedule/posting time** → both cron lines in `briefing.yml` (UTC!)
  *and* `TARGET_HOUR`. Two crons exist on purpose for DST; keep both.
- **Change Telegram formatting** → `regionMessage()`/`sendTelegram()`.

## Conventions & gotchas

- ESM everywhere (`import`), Node ≥ 20, no TypeScript, no bundler.
- Keep it dependency-light and free-tier friendly; avoid adding heavy deps.
- Network calls are best-effort: `safeFetchText()` swallows errors and returns
  `""`, so a dead source degrades gracefully rather than crashing the run.
- Cron times in the workflow are **UTC**; the human-facing 08:00 is Europe/Rome.
- The workflow needs `permissions: contents: write` to commit memory — keep it.
- The two daily runs never conflict: the wrong-hour one exits before touching
  state (`concurrency` group + time guard).
- **Heads-up on `.github/workflows/briefing.yml`:** the `env:` block currently
  has an indentation inconsistency on the `BYPASS_TIME_GUARD` line (fewer
  leading spaces than its siblings). If you touch that file, align the `env`
  keys to the same indentation or the workflow YAML won't parse. Note that
  `BYPASS_TIME_GUARD: "true"` there makes the scheduled run ignore the time
  guard — remove it if you want the guard to govern scheduled posts.

## Git / branching

- Active development branch for automated changes: `claude/claude-md-docs-bvbl9t`
  (branch from latest `main`; create locally if absent).
- CI auto-commits `state/seen.json` as `github-actions[bot]` with a
  `[skip ci]` message — don't hand-edit that file expecting it to stick unless
  you also understand the run overwrites it.
- Do not open a PR unless explicitly asked.
