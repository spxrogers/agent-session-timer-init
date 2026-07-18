import type { PingProviderRequest, Provider, ProviderPingResponse } from "../types";

/**
 * Secondary example provider (OpenAI / Codex).
 *
 * The `openai` package is an OPTIONAL dependency — it is loaded lazily and only
 * when you actually select this provider (PING_PROVIDER=openai). This keeps the
 * default Anthropic install lean and the Next.js bundle from pulling it in.
 *
 * Install it when you want to use this provider:  npm install openai
 */
const DEFAULT_MODEL = "gpt-4o-mini";

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

      const response = await client.responses.create({
        model,
        input: message,
        max_output_tokens: maxTokens,
      });

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
  } catch {
    throw new Error(
      "The 'openai' package is required for the openai provider. Install it with: npm install openai",
    );
  }
}
