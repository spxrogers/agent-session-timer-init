/**
 * Core types for the session-timer ping wrapper.
 *
 * The core is deliberately provider-agnostic: adding a new provider (OpenAI /
 * Codex, Gemini, ...) means implementing the {@link Provider} interface and
 * registering it in `./index.ts`. Nothing here imports Next.js — the core is a
 * plain, scriptable TypeScript module.
 */

export type ProviderName = "anthropic" | "openai";

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
  /** How the request authenticated, for observability, e.g. "oauth" | "api-key". */
  authMode?: string;
}

export interface Provider {
  readonly name: ProviderName;
  /** Model used when no override is configured — should be the cheapest sensible one. */
  readonly defaultModel: string;
  ping(request: PingProviderRequest): Promise<ProviderPingResponse>;
}

/** The normalized result surfaced to callers (CLI, API route, tests). */
export interface PingResult {
  ok: boolean;
  provider: ProviderName;
  model: string;
  /** The message that was sent. */
  message: string;
  /** The model's reply text (empty on error). */
  reply: string;
  usage?: ProviderUsage;
  authMode?: string;
  latencyMs: number;
  /** ISO-8601 timestamp of when the ping started. */
  timestamp: string;
  dryRun: boolean;
  error?: string;
}
