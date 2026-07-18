import type { PingProviderRequest, Provider, ProviderPingResponse } from "../types";

/**
 * Secondary example provider (OpenAI / Codex).
 *
 * The `openai` package is an optional, on-demand dependency (not declared in
 * package.json) — it is loaded lazily and only when you actually select this
 * provider (PING_PROVIDER=openai), keeping the default Anthropic install lean.
 *
 * Install it when you want to use this provider:  npm install openai
 */
// gpt-5-nano is OpenAI's newest + cheapest tier ($0.05/$0.40 per 1M) and the
// recommended successor to the now-deprecating 4o-mini / 4.1-nano models — a
// better long-term default. It's a reasoning model, so ping() turns reasoning
// off (below) to keep the keepalive dirt cheap.
const DEFAULT_MODEL = "gpt-5-nano";

export function createOpenAIProvider(): Provider {
  return {
    name: "openai",
    defaultModel: DEFAULT_MODEL,
    async ping({ model, message, maxTokens }: PingProviderRequest): Promise<ProviderPingResponse> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("No OpenAI credentials found. Set OPENAI_API_KEY to use the openai provider.");
      }

      const OpenAI = await loadOpenAI();
      const client = new OpenAI({ apiKey });

      const params: Record<string, unknown> = {
        model,
        input: message,
        // The Responses API rejects max_output_tokens < 16; the shared default
        // is 16, but clamp in case PING_MAX_TOKENS is set lower for Anthropic.
        max_output_tokens: Math.max(16, maxTokens),
      };
      // GPT-5 models reason by default; disable it so a keepalive ping doesn't
      // spend its tiny token budget (and money) on chain-of-thought. Only sent
      // for gpt-5* so a non-reasoning override model isn't handed a bad param.
      if (model.startsWith("gpt-5")) {
        params.reasoning = { effort: "none" };
      }

      const response = await client.responses.create(params);

      return {
        model: response.model ?? model,
        text: (response.output_text ?? "").trim(),
        usage: {
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
        },
        authMode: "api-key",
      };
    },
  };
}

/**
 * Load the optional `openai` package without letting the bundler/type-checker
 * try to resolve it at build time (it may not be installed). The indirection
 * through `new Function` hides the specifier from static analysis.
 */
const importModule = new Function("specifier", "return import(specifier);") as (
  specifier: string,
) => Promise<any>;

async function loadOpenAI(): Promise<any> {
  try {
    const mod = await importModule("openai");
    return mod.default ?? mod.OpenAI ?? mod;
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
      throw new Error(
        "The 'openai' package is not installed. Install it with: npm install openai",
      );
    }
    // Installed but failed to load — surface the real error instead of masking
    // it as "not installed".
    throw err instanceof Error
      ? new Error(`Failed to load the 'openai' package: ${err.message}`, { cause: err })
      : err;
  }
}
