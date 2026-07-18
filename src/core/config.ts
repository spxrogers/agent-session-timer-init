import { boolFromEnv, envValue, intFromEnv } from "./env";
import type { ProviderName } from "./types";

/**
 * Resolved configuration for a single ping.
 *
 * Everything is driven by environment variables so the same core runs
 * unchanged from the CLI, a scheduled job, or a test. Any field can be
 * overridden programmatically via {@link loadConfig}'s argument.
 */
export interface PingConfig {
  provider: ProviderName;
  /** Optional model override; when unset the provider's default (cheapest) is used. */
  model?: string;
  message: string;
  maxTokens: number;
  /** When true, no network request is made — used for smoke tests / CI. */
  dryRun: boolean;
}

const DEFAULT_PROVIDER: ProviderName = "anthropic";
const DEFAULT_MESSAGE = "hello 👋";
const DEFAULT_MAX_TOKENS = 16;

export function loadConfig(overrides: Partial<PingConfig> = {}): PingConfig {
  return {
    // A bad PING_PROVIDER is surfaced with a friendly error by getProvider().
    provider:
      overrides.provider ??
      (envValue(process.env.PING_PROVIDER) as ProviderName | undefined) ??
      DEFAULT_PROVIDER,
    model: overrides.model ?? envValue(process.env.PING_MODEL),
    message: overrides.message ?? envValue(process.env.PING_MESSAGE) ?? DEFAULT_MESSAGE,
    maxTokens: overrides.maxTokens ?? intFromEnv("PING_MAX_TOKENS", DEFAULT_MAX_TOKENS),
    dryRun: overrides.dryRun ?? boolFromEnv("PING_DRY_RUN", false),
  };
}
