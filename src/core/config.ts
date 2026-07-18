import type { ProviderName } from "./types";

/**
 * Resolved configuration for a single ping.
 *
 * Everything is driven by environment variables so the same core runs
 * unchanged from the CLI, a Vercel cron route, or a test. Any field can be
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
    provider:
      overrides.provider ??
      (emptyToUndefined(process.env.PING_PROVIDER) as ProviderName | undefined) ??
      DEFAULT_PROVIDER,
    model: overrides.model ?? emptyToUndefined(process.env.PING_MODEL),
    message: overrides.message ?? emptyToUndefined(process.env.PING_MESSAGE) ?? DEFAULT_MESSAGE,
    maxTokens: overrides.maxTokens ?? intFromEnv("PING_MAX_TOKENS", DEFAULT_MAX_TOKENS),
    dryRun: overrides.dryRun ?? boolFromEnv("PING_DRY_RUN", false),
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}
