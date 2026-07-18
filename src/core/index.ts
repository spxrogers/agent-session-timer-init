import { loadConfig, type PingConfig } from "./config";
import type { PingResult, Provider, ProviderName } from "./types";

/**
 * Provider registry. Modules are imported lazily so that selecting `anthropic`
 * never loads the optional `openai` code (and vice versa).
 *
 * To add a provider: implement the `Provider` interface in `./providers/<name>.ts`
 * and add a case here.
 */
async function getProvider(name: ProviderName): Promise<Provider> {
  switch (name) {
    case "anthropic": {
      const { createAnthropicProvider } = await import("./providers/anthropic");
      return createAnthropicProvider();
    }
    case "openai": {
      const { createOpenAIProvider } = await import("./providers/openai");
      return createOpenAIProvider();
    }
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown provider: ${String(exhaustive)}`);
    }
  }
}

/**
 * Send a single tiny "hello 👋" ping to keep a session window warm.
 *
 * Never throws: failures are captured in `result.ok === false` with an `error`
 * message, so schedulers and HTTP handlers can report status without try/catch.
 */
export async function ping(overrides: Partial<PingConfig> = {}): Promise<PingResult> {
  const config = loadConfig(overrides);
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  let model = config.model ?? "(unresolved)";

  try {
    const provider = await getProvider(config.provider);
    model = config.model ?? provider.defaultModel;

    if (config.dryRun) {
      return {
        ok: true,
        provider: config.provider,
        model,
        message: config.message,
        reply: "(dry run — no request sent)",
        authMode: "dry-run",
        latencyMs: Date.now() - startedAt,
        timestamp,
        dryRun: true,
      };
    }

    const response = await provider.ping({
      model,
      message: config.message,
      maxTokens: config.maxTokens,
    });

    return {
      ok: true,
      provider: config.provider,
      model: response.model,
      message: config.message,
      reply: response.text,
      usage: response.usage,
      authMode: response.authMode,
      latencyMs: Date.now() - startedAt,
      timestamp,
      dryRun: false,
    };
  } catch (error) {
    return {
      ok: false,
      provider: config.provider,
      model,
      message: config.message,
      reply: "",
      latencyMs: Date.now() - startedAt,
      timestamp,
      dryRun: config.dryRun,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { loadConfig } from "./config";
export type { PingConfig } from "./config";
export type {
  PingProviderRequest,
  PingResult,
  Provider,
  ProviderName,
  ProviderPingResponse,
  ProviderUsage,
} from "./types";
