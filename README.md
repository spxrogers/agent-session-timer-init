# agent-session-timer-init 👋

A small, provider-agnostic wrapper around AI agent SDKs that sends a **dirt-cheap
"hello 👋"** (Haiku by default) on a schedule. Each ping starts / refreshes a
session window so you **never sit idle on the timer** — maximizing your Claude
buckets.

- **Isolated, scriptable core** (`src/core/`) — zero framework dependencies. Run
  it from the CLI, import it anywhere, or wire it into any scheduler.
- **Multi-provider by config** — Anthropic first (your number one 🥇), OpenAI /
  Codex included as an example. Add more by implementing one interface.
- **Free, multi-agent scheduling via GitHub Actions** — one reusable workflow +
  a thin caller per agent (Claude live, Codex seeded/disabled). Each pings on its
  own schedule and keeps itself alive. No server, no hosting bill.

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
const oai = await ping({ provider: "openai", model: "gpt-5-nano" });
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

1. Add the name to the `ProviderName` union in `src/core/types.ts`.
2. Create `src/core/providers/<name>.ts` exporting a factory that returns a
   `Provider` (see `types.ts`).
3. Add a `case` in `getProvider()` in `src/core/index.ts`.

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

Scheduling is **multi-agent** so you can keep several agents warm at once. The
logic lives once in a reusable workflow; each agent is a thin caller:

| File | Role |
| ---- | ---- |
| [`.github/workflows/_ping.yml`](./.github/workflows/_ping.yml) | Reusable — install, run `npm run ping`, keepalive. Not scheduled directly. |
| [`.github/workflows/ping-claude.yml`](./.github/workflows/ping-claude.yml) | **Live.** Hourly, `provider: anthropic`. |
| [`.github/workflows/ping-codex.yml`](./.github/workflows/ping-codex.yml) | **Seeded but disabled.** `provider: openai`; schedule commented out. |

Each caller runs `npm run ping` on a free Ubuntu runner — no hosting needed.

**Turn on Claude:**

1. Add your credential in **Settings → Secrets and variables → Actions → New
   repository secret**: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`).
2. Merge to your **default branch** — ⚠️ scheduled workflows only fire from the
   default branch. Until then, use the **Run workflow** button (Actions tab) to
   test; each caller has a `dry_run` toggle.
3. Cadence is `0 * * * *` (top of every hour) so a manual session started
   off-cycle isn't left waiting; edit the `cron:` line in the caller to taste.
   GitHub may delay scheduled runs a few minutes under load — fine here.

**Add another agent** (or enable Codex): copy a caller, set `agent:` /
`provider:` (and offset the `cron:` a few minutes so they don't fire at once),
add that provider's secret, and — for `openai` — nothing else, `_ping.yml`
installs the `openai` package automatically. Enable Codex by uncommenting the
`schedule:` block in `ping-codex.yml`.

Free minutes are a non-issue: public repos are unlimited, and an hourly ping on a
private repo uses roughly 720 of the 2,000 free minutes/month.

> **The one gotcha:** GitHub auto-disables scheduled workflows after **60 days
> with no commits**. `_ping.yml` handles this — if the repo has been quiet for
> 45+ days it appends one line to `./.keep-alive.txt` (timestamp, which agent,
> and a link to the run) and commits it, so the schedule never goes idle. It's a
> sparse log (~1 line every 45 days); the first agent to run resets the timer so
> the others skip. (No setup needed; it's why the callers grant `contents: write`.)

Prefer a different scheduler? The core is just a CLI — anything that can run
`npm run ping` on a timer (a cron box, Cloudflare Workers, etc.) works too.

---

## OpenAI / Codex (secondary example)

`openai` is an **optional, on-demand** dependency (not in `package.json`), loaded
lazily only when selected:

```bash
npm install openai
PING_PROVIDER=openai OPENAI_API_KEY=sk-... npm run ping
```

Defaults to `gpt-5-nano` with reasoning turned off (OpenAI's newest/cheapest
tier); override with `PING_MODEL`.

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
  _ping.yml             # reusable: install + run + keepalive
  ping-claude.yml       # live caller (hourly, anthropic)
  ping-codex.yml        # seeded/disabled caller (openai)
.keep-alive.txt         # sparse keepalive log (auto-written, ~1 line / 45d)
```
