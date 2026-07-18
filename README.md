# Agent Session Timer 👋

A small, provider-agnostic wrapper around AI agent SDKs that sends a **dirt-cheap
"hello 👋"** (Haiku by default) on a schedule. Each ping starts / refreshes a
session window so you **never sit idle on the timer** — maximizing your Claude
buckets.

- **Isolated, scriptable core** (`src/core/`) — zero framework dependencies. Run
  it from the CLI, import it anywhere, or wire it into any scheduler.
- **Multi-provider by config** — Anthropic first (your number one 🥇), OpenAI /
  Codex included as an example. Add more by implementing one interface.
- **Free scheduling via GitHub Actions** — a workflow pings every few hours and
  keeps itself alive. No server, no hosting bill.

---

## How it works

The 5-hour Claude subscription usage window ("bucket") starts on your first
message and rolls forward. This tool sends a tiny message on a cadence shorter
than that window so a session is always active — you're never waiting for a new
window to spin up when you actually want to work.

For that to touch your **subscription** buckets, authenticate with a Claude
**OAuth token** (below), not an API key.

---

## Quick start

```bash
npm install

# copy env template and fill in ONE Anthropic credential
cp .env.example .env

# smoke test — no network call, no credentials needed
npm run ping -- --dry-run

# real ping
npm run ping
```

Example output:

```
✅ ping ok
   provider : anthropic (oauth)
   model    : claude-haiku-4-5
   message  : hello 👋
   latency  : 512ms
   time     : 2026-07-18T12:00:00.000Z
   reply    : Hello! 👋
   usage    : in=9 out=5
```

---

## Authentication (Anthropic)

Pick **one** mode. The provider auto-detects which is set (OAuth wins).

| Mode | Env var | Effect |
| ---- | ------- | ------ |
| **OAuth / subscription** (recommended) | `CLAUDE_CODE_OAUTH_TOKEN` | Authenticates as your Claude plan and **consumes/starts your subscription usage window** — this is what keeps your bucket warm. |
| API key | `ANTHROPIC_API_KEY` | Standard pay-per-token API. Fine as a health check, but billed separately and does **not** touch subscription buckets. |

Generate a long-lived OAuth token for automation:

```bash
claude setup-token   # from Claude Code — prints a CLAUDE_CODE_OAUTH_TOKEN
```

Under the hood, OAuth mode sends the token as `Authorization: Bearer …` with the
`anthropic-beta: oauth-2025-04-20` header — the documented subscription path.

---

## The core (`src/core/`)

Framework-free and scriptable. The public surface is a single function:

```ts
import { ping } from "./src/core";

const result = await ping();                 // uses env config
const dry = await ping({ dryRun: true });    // no network call
const oai = await ping({ provider: "openai", model: "gpt-4o-mini" });
```

`ping()` never throws — failures come back as `{ ok: false, error }` so
schedulers and scripts stay simple.

### Configuration (env vars)

| Var | Default | Purpose |
| --- | ------- | ------- |
| `PING_PROVIDER` | `anthropic` | `anthropic` \| `openai` |
| `PING_MODEL` | provider default (`claude-haiku-4-5`) | Model override |
| `PING_MESSAGE` | `hello 👋` | The message to send |
| `PING_MAX_TOKENS` | `16` | Output token cap (keep small = cheap) |
| `PING_DRY_RUN` | `false` | Skip the network call |

### Adding a provider

1. Create `src/core/providers/<name>.ts` exporting a factory that returns a
   `Provider` (see `types.ts`).
2. Add a `case` in `getProvider()` in `src/core/index.ts`.

That's it — the CLI and the scheduled workflow pick it up automatically.

---

## CLI

```bash
npm run ping -- --dry-run
npm run ping -- --provider=anthropic --model=claude-haiku-4-5
npm run ping -- --message="hi 👋" --json
npm run ping -- --help
```

Exit code is `0` on success, `1` on failure — friendly for shell scripts and
external cron.

---

## Scheduling it (GitHub Actions)

The repo already lives on GitHub, so [`.github/workflows/ping.yml`](./.github/workflows/ping.yml)
runs `npm run ping` on a schedule on a free Ubuntu runner — no hosting needed.

1. Add your credential in **Settings → Secrets and variables → Actions → New
   repository secret**: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`).
2. Merge this workflow to your **default branch** — ⚠️ scheduled workflows only
   fire from the default branch. Until then, use the **Run workflow** button
   (Actions tab) to test; it has a `dry_run` toggle.
3. Default cadence is **every 4 hours** (`0 */4 * * *`); edit the `cron:` line to
   taste. GitHub may delay scheduled runs a few minutes under load — fine here.

Free minutes are a non-issue: public repos are unlimited, and a 4-hour ping on a
private repo uses ~180 of the 2,000 free minutes/month.

> **The one gotcha:** GitHub auto-disables scheduled workflows after **60 days
> with no commits**. The workflow handles this itself — if the repo has been
> quiet for 45+ days it makes a tiny `last-ping.txt` keepalive commit, so it
> never goes idle. (This needs no setup; it's why the workflow has
> `permissions: contents: write`.)

Prefer a different scheduler? The core is just a CLI — anything that can run
`npm run ping` on a timer (a cron box, Cloudflare Workers, etc.) works too.

---

## OpenAI / Codex (secondary example)

`openai` is an **optional** dependency, loaded lazily only when selected:

```bash
npm install openai
PING_PROVIDER=openai OPENAI_API_KEY=sk-... npm run ping
```

Defaults to `gpt-4o-mini`; override with `PING_MODEL`.

---

## Project layout

```
src/
  core/                 # framework-free, scriptable
    types.ts            # Provider interface + result types
    config.ts           # env-driven config
    index.ts            # ping() orchestrator + provider registry
    providers/
      anthropic.ts      # Anthropic (Haiku), OAuth or API-key auth
      openai.ts         # optional OpenAI/Codex example
  cli.ts                # `npm run ping`
.github/workflows/
  ping.yml              # scheduled run (every 4h) + keepalive
```
