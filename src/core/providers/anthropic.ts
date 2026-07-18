import Anthropic from "@anthropic-ai/sdk";

import type { PingProviderRequest, Provider, ProviderPingResponse } from "../types";

/**
 * Dirt-cheap by default. Haiku is Anthropic's least expensive current model,
 * and a ~2-word prompt with a tiny max_tokens keeps each ping to a rounding
 * error. Override with PING_MODEL if you want a different model.
 */
const DEFAULT_MODEL = "claude-haiku-4-5";

/** Beta header required when authenticating with a Claude subscription OAuth token. */
const OAUTH_BETA_HEADER = "oauth-2025-04-20";

export function createAnthropicProvider(): Provider {
  return {
    name: "anthropic",
    defaultModel: DEFAULT_MODEL,
    async ping({ model, message, maxTokens }: PingProviderRequest): Promise<ProviderPingResponse> {
      const { client, authMode } = createClient();

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: message }],
      });

      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();

      return {
        model: response.model,
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        authMode,
      };
    },
  };
}

/**
 * Auth auto-detection, in priority order:
 *
 *   1. CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_AUTH_TOKEN  -> subscription (OAuth) mode.
 *      This authenticates as your Claude plan and *consumes your subscription's
 *      usage window* — i.e. it starts/keeps a session "bucket" warm. This is the
 *      mode you want for the "never idle" goal. Generate a long-lived token with
 *      `claude setup-token`.
 *
 *   2. ANTHROPIC_API_KEY -> standard pay-per-token API mode. Fine for a health
 *      check, but API usage is billed separately and does NOT touch your
 *      subscription buckets.
 */
function createClient(): { client: Anthropic; authMode: string } {
  // Treat empty/whitespace as unset (like config.ts) BEFORE `??`, so an empty
  // CLAUDE_CODE_OAUTH_TOKEN= line doesn't shadow the ANTHROPIC_AUTH_TOKEN alias.
  const oauthToken = nonEmpty(process.env.CLAUDE_CODE_OAUTH_TOKEN) ?? nonEmpty(process.env.ANTHROPIC_AUTH_TOKEN);
  const apiKey = nonEmpty(process.env.ANTHROPIC_API_KEY);

  if (oauthToken) {
    // Pass apiKey: null so the SDK does not also read ANTHROPIC_API_KEY from the
    // environment and send both credentials (the API rejects that).
    return {
      client: new Anthropic({
        apiKey: null,
        authToken: oauthToken,
        defaultHeaders: { "anthropic-beta": OAUTH_BETA_HEADER },
      }),
      authMode: "oauth",
    };
  }

  if (apiKey) {
    return { client: new Anthropic({ apiKey }), authMode: "api-key" };
  }

  throw new Error(
    "No Anthropic credentials found. Set CLAUDE_CODE_OAUTH_TOKEN (recommended — warms " +
      "your Claude subscription session) or ANTHROPIC_API_KEY.",
  );
}

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
