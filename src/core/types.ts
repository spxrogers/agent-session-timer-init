/**
 * Core types for the session-timer ping wrapper.
 *
 * The core is deliberately provider-agnostic: adding a new provider (OpenAI /
 * Codex, Gemini, ...) means adding its name to {@link PROVIDER_NAMES},
 * implementing the {@link Provider} interface, and registering it in
 * `./index.ts`. Nothing here imports a web framework — the core is a plain,
 * scriptable TypeScript module.
 */

/** The known providers. `ProviderName` is derived from this, so it's the single
 *  source of truth for both the type and runtime validation. */
export const PROVIDER_NAMES = ["anthropic", "openai"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}

/** How a request authenticated (also used to label a dry run). */
export type AuthMode = "oauth" | "api-key" | "dry-run";

/** What the orchestrator hands a provider to perform a single ping. */
export interface PingProviderRequest {
  /** Fully-resolved model id (provider default already applied). */
  model: string;
  /** The tiny message to send, e.g. "hello 👋". */
  message: string;
  /** Cap on output tokens — kept small to stay dirt cheap. */
  maxTokens: number;
}

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
}

/** What a provider returns from a successful ping. */
export interface ProviderPingResponse {
  /** Model id echoed back by the API (may differ from the requested alias). */
  model: string;
  /** Text content of the reply (usually a short greeting). */
  text: string;
  usage?: ProviderUsage;
  authMode?: AuthMode;
}

export interface Provider {
  readonly name: ProviderName;
  /** Model used when no override is configured — should be the cheapest sensible one. */
  readonly defaultModel: string;
  ping(request: PingProviderRequest): Promise<ProviderPingResponse>;
}

interface PingResultBase {
  provider: ProviderName;
  model: string;
  /** The message that was sent. */
  message: string;
  /** The model's reply text ("" on failure). */
  reply: string;
  latencyMs: number;
  /** ISO-8601 timestamp of when the ping started. */
  timestamp: string;
  dryRun: boolean;
}

export interface PingSuccess extends PingResultBase {
  ok: true;
  usage?: ProviderUsage;
  authMode?: AuthMode;
}

export interface PingFailure extends PingResultBase {
  ok: false;
  error: string;
}

/**
 * The normalized result surfaced to callers (CLI, scheduled job, tests).
 * Discriminated on `ok`: a success carries `usage`/`authMode`, a failure
 * carries `error` — so `if (result.ok)` narrows the shape at compile time.
 */
export type PingResult = PingSuccess | PingFailure;
