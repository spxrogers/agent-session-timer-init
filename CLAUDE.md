# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tiny, provider-agnostic wrapper that sends a dirt-cheap `hello 👋` to an AI
agent API on a schedule, to keep a provider's session/usage window warm ("never
idle on the timer"). The point is to *start/refresh* that window as cheaply as
possible — hence Haiku with `max_tokens: 16`. The default model
(`claude-haiku-4-5`) is deliberately the cheapest: **cheap is the feature — do
not "upgrade" the default to Opus.**

## Commands

- `npm install`
- `npm run typecheck` — `tsc --noEmit`; this is the primary correctness gate.
  **There is no test suite.**
- `npm run ping` — run the ping using env config.
- `npm run ping -- --dry-run` — resolve config and exit with no network call.
  Use this to smoke-test changes without credentials.
- `npm run ping -- --provider=openai --model=… --message="hi" --json` — overrides.
- `npm run ping -- --help`.

The CLI runs TypeScript directly via `tsx` — there is **no build step and no web
server**. Exit code is `0`/`1`, derived from `result.ok`.

## Architecture

**`src/core/` — framework-free; the only layer with logic.**

- `ping(overrides?)` in `index.ts` is the single entry point. **It never
  throws** — every failure comes back as `PingResult { ok: false, error }`.
  Callers branch on `result.ok` (the CLI's exit code and any scheduler depend on
  this); preserve the contract.
- Providers resolve **lazily**: `getProvider()` `await import()`s
  `providers/<name>.ts` only for the selected provider, so choosing `anthropic`
  never loads the `openai` code (and vice versa). **Add a provider** =
  implement the `Provider` interface (`types.ts`) in a new `providers/*.ts` and
  add one `case` to `getProvider()`.
- `config.ts` (`loadConfig`) is env-driven and merges programmatic overrides.
  Empty-string env vars are treated as unset — this matters because GitHub
  Actions expands an unset `vars.*` to `""`.

**Anthropic auth is the core domain nuance** (`providers/anthropic.ts`) — it
auto-detects two modes, and the difference *is* the point of the project:

- `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_AUTH_TOKEN` → **subscription/OAuth mode**
  (SDK `authToken` + header `anthropic-beta: oauth-2025-04-20`, with
  `apiKey: null` so the SDK doesn't also send `x-api-key` and get rejected).
  This warms your Claude *subscription* usage window — the "bucket."
- `ANTHROPIC_API_KEY` → pay-per-token API mode; a health check that does **not**
  touch subscription buckets.

**`providers/openai.ts`** — `openai` is an optional dependency, loaded through a
`new Function(…import…)` indirection so bundlers/`tsc` never try to resolve it
unless it's installed and the provider is selected.

**`.github/workflows/` — scheduling is multi-agent by design.**

- `_ping.yml` is a **reusable** workflow (`workflow_call`) that owns install +
  run + keepalive.
- Each agent is a thin caller `ping-<agent>.yml` that sets its own
  `schedule`/`concurrency` and calls `_ping.yml` with `secrets: inherit` and its
  `provider`. `ping-claude.yml` is live; `ping-codex.yml` is seeded but
  **disabled** (its `schedule:` is commented out). Add/enable an agent by copying
  a caller and offsetting its `cron`, then adding that provider's secret;
  `_ping.yml` auto-runs `npm install openai` for the `openai` provider.
- **Keepalive:** GitHub disables scheduled workflows after 60 days without
  commits. When the repo has been quiet 45+ days, `_ping.yml` appends one line
  (timestamp, agent, run id + url) to `./.keep-alive.txt` and commits it — a
  sparse log. The first agent to run in a quiet stretch resets the timer so the
  others skip (no push race).
- Gotcha: **scheduled workflows only run from the default branch.** To test from
  another branch, use the "Run workflow" (`workflow_dispatch`) button every
  caller exposes, which has a `dry_run` toggle.

## Conventions

- ESM + strict TypeScript throughout, no framework. This project intentionally
  has no build/deploy step and no web server — an earlier Next.js/Vercel harness
  was removed in favor of external (GitHub Actions) scheduling. Don't
  reintroduce one unless asked.
