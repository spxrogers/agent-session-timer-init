# Agent Session Timer 👋

A small, provider-agnostic wrapper around AI agent SDKs that sends a **dirt-cheap
"hello 👋"** (Haiku by default) on a schedule. Each ping starts / refreshes a
session window so you **never sit idle on the timer** — maximizing your Claude
buckets.

- **Isolated, scriptable core** (`src/core/`) — zero framework dependencies. Run
  it from the CLI, import it anywhere, or wire it into any scheduler.
- **Multi-provider by config** — Anthropic first (your number one 🥇), OpenAI /
  Codex included as an example. Add more by implementing one interface.
- **Next.js ingress harness** — an `/api/cron` route ready to deploy to Vercel
  and run on a schedule via Vercel Cron.

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
schedulers and HTTP handlers stay simple.

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

That's it — the CLI and the API route pick it up automatically.

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

## Deploy to Vercel (scheduled)

1. Push this repo and import it into Vercel.
2. Set environment variables in the Vercel project:
   - `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`)
   - `CRON_SECRET` — a random string. Vercel Cron automatically sends it as
     `Authorization: Bearer <CRON_SECRET>`, and `/api/cron` requires it.
3. The schedule lives in [`vercel.json`](./vercel.json) — default **every 4
   hours** (`0 */4 * * *`), comfortably under the 5-hour window.

Trigger manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron
curl -H "Authorization: Bearer $CRON_SECRET" "https://<your-app>/api/cron?dryRun=1"
```

> **Vercel plan note:** Hobby projects run cron jobs at most **once per day**.
> The 4-hour cadence needs a **Pro** plan. On Hobby, change the schedule to e.g.
> `0 9 * * *` (daily) — or run the CLI from your own scheduler.

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
  app/                  # Next.js App Router (ingress harness)
    layout.tsx
    page.tsx            # status page
    api/cron/route.ts   # scheduled ping endpoint
vercel.json             # cron schedule
```
