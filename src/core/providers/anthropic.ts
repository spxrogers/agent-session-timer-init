import Anthropic from "@anthropic-ai/sdk";

import { envValue } from "../env";
import type { AuthMode, PingProviderRequest, Provider, ProviderPingResponse } from "../types";

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

export type AnthropicAuth =
  | { mode: "oauth"; token: string }
  | { mode: "api-key"; apiKey: string };

/**
 * Resolve which auth mode to use from the environment. Pure and exported so the
 * branch — the core domain nuance — is unit-testable without a network call.
 * Priority order (and the difference between them) is the point of the project:
 *
 *   1. CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_AUTH_TOKEN -> subscription (OAuth) mode.
 *      Authenticates as your Claude plan and *consumes your subscription's usage
 *      window* — i.e. warms a session "bucket." Generate a long-lived token with
 *      `claude setup-token`.
 *   2. ANTHROPIC_API_KEY -> pay-per-token API mode. A health check that does NOT
 *      touch subscription buckets.
 *
 * Empty/whitespace values are treated as unset (and tokens are trimmed) so an
 * empty CLAUDE_CODE_OAUTH_TOKEN= line doesn't shadow the ANTHROPIC_AUTH_TOKEN
 * alias, and a copied trailing newline never reaches the Authorization header.
 */
export function resolveAnthropicAuth(env: NodeJS.ProcessEnv = process.env): AnthropicAuth {
  const oauthToken =
    envValue(env.CLAUDE_CODE_OAUTH_TOKEN, { trim: true }) ??
    envValue(env.ANTHROPIC_AUTH_TOKEN, { trim: true });
  const apiKey = envValue(env.ANTHROPIC_API_KEY, { trim: true });

  if (oauthToken) return { mode: "oauth", token: oauthToken };
  if (apiKey) return { mode: "api-key", apiKey };

  throw new Error(
    "No Anthropic credentials found. Set CLAUDE_CODE_OAUTH_TOKEN (recommended — warms " +
      "your Claude subscription session) or ANTHROPIC_API_KEY.",
  );
}

function createClient(): { client: Anthropic; authMode: AuthMode } {
  const auth = resolveAnthropicAuth();

  if (auth.mode === "oauth") {
    // Pass apiKey: null so the SDK does not also read ANTHROPIC_API_KEY from the
    // environment and send both credentials (the API rejects that).
    return {
      client: new Anthropic({
        apiKey: null,
        authToken: auth.token,
        defaultHeaders: { "anthropic-beta": OAUTH_BETA_HEADER },
      }),
      authMode: "oauth",
    };
  }

  return { client: new Anthropic({ apiKey: auth.apiKey }), authMode: "api-key" };
}
