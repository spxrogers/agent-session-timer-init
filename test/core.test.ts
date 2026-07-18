import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { loadConfig, ping } from "../src/core";
import { resolveAnthropicAuth } from "../src/core/providers/anthropic";

// loadConfig reads process.env; snapshot and restore around the tests that mutate it.
const PING_KEYS = ["PING_PROVIDER", "PING_MODEL", "PING_MESSAGE", "PING_MAX_TOKENS", "PING_DRY_RUN"];
const saved = new Map(PING_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("loadConfig: overrides > env > defaults", () => {
  process.env.PING_PROVIDER = "openai";
  process.env.PING_MESSAGE = "from-env";
  assert.equal(loadConfig().provider, "openai");
  assert.equal(loadConfig().message, "from-env");
  // programmatic override wins over env
  assert.equal(loadConfig({ provider: "anthropic" }).provider, "anthropic");

  delete process.env.PING_PROVIDER;
  delete process.env.PING_MESSAGE;
  assert.equal(loadConfig().provider, "anthropic"); // default
  assert.equal(loadConfig().message, "hello 👋"); // default
  assert.equal(loadConfig().maxTokens, 16); // default
});

test("loadConfig: empty-string env vars are treated as unset (GitHub Actions vars.* => '')", () => {
  process.env.PING_PROVIDER = "";
  process.env.PING_MODEL = "";
  process.env.PING_MESSAGE = "";
  const cfg = loadConfig();
  assert.equal(cfg.provider, "anthropic"); // NOT ""
  assert.equal(cfg.model, undefined); // NOT ""
  assert.equal(cfg.message, "hello 👋"); // NOT ""
});

test("resolveAnthropicAuth: OAuth precedence, alias, trimming, api-key fallback, throw", () => {
  // OAuth token selected
  assert.deepEqual(resolveAnthropicAuth({ CLAUDE_CODE_OAUTH_TOKEN: "t" }), {
    mode: "oauth",
    token: "t",
  });
  // an empty primary must NOT shadow the ANTHROPIC_AUTH_TOKEN alias (the round-1 bug)
  assert.deepEqual(
    resolveAnthropicAuth({ CLAUDE_CODE_OAUTH_TOKEN: "", ANTHROPIC_AUTH_TOKEN: "alias" }),
    { mode: "oauth", token: "alias" },
  );
  // tokens are trimmed (trailing newline in a copied secret)
  assert.deepEqual(resolveAnthropicAuth({ ANTHROPIC_AUTH_TOKEN: "  t\n" }), {
    mode: "oauth",
    token: "t",
  });
  // OAuth wins over an API key
  assert.equal(
    resolveAnthropicAuth({ CLAUDE_CODE_OAUTH_TOKEN: "t", ANTHROPIC_API_KEY: "k" }).mode,
    "oauth",
  );
  // API-key fallback
  assert.deepEqual(resolveAnthropicAuth({ ANTHROPIC_API_KEY: "k" }), {
    mode: "api-key",
    apiKey: "k",
  });
  // whitespace-only = unset => throws
  assert.throws(() => resolveAnthropicAuth({ CLAUDE_CODE_OAUTH_TOKEN: "   " }));
  // nothing set => throws
  assert.throws(() => resolveAnthropicAuth({}));
});

test("ping() never throws: dry-run succeeds, unknown provider fails gracefully", async () => {
  const ok = await ping({ dryRun: true });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.dryRun, true);

  // getProvider throws internally for an unknown provider — ping must catch it.
  const bad = await ping({ provider: "nope" as never, dryRun: false });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /Unknown provider/);
});
