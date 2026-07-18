#!/usr/bin/env node
import "dotenv/config";

import {
  isProviderName,
  ping,
  PROVIDER_NAMES,
  type PingConfig,
  type PingResult,
  type ProviderName,
} from "./core";

/**
 * Scriptable entry point.
 *
 *   npm run ping                         # real ping using env config
 *   npm run ping -- --dry-run            # no network call (smoke test)
 *   npm run ping -- --provider=anthropic --model=claude-haiku-4-5
 *   npm run ping -- --message="hi 👋" --max-tokens=8 --json
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  if (flags.provider !== undefined && !isProviderName(flags.provider)) {
    console.error(
      `Unknown provider "${flags.provider}". Known providers: ${PROVIDER_NAMES.join(", ")}.`,
    );
    process.exit(1);
  }

  const overrides: Partial<PingConfig> = {};
  if (flags.dryRun) overrides.dryRun = true;
  if (flags.provider) overrides.provider = flags.provider as ProviderName;
  if (flags.model) overrides.model = flags.model;
  if (flags.message) overrides.message = flags.message;
  if (flags.maxTokens !== undefined) overrides.maxTokens = flags.maxTokens;

  const result = await ping(overrides);

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  process.exit(result.ok ? 0 : 1);
}

interface Flags {
  dryRun: boolean;
  json: boolean;
  help: boolean;
  provider?: string;
  model?: string;
  message?: string;
  maxTokens?: number;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, json: false, help: false };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--json") flags.json = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg.startsWith("--provider=")) flags.provider = value(arg);
    else if (arg.startsWith("--model=")) flags.model = value(arg);
    else if (arg.startsWith("--message=")) flags.message = value(arg);
    else if (arg.startsWith("--max-tokens=")) {
      const parsed = Number.parseInt(value(arg), 10);
      if (Number.isFinite(parsed) && parsed > 0) flags.maxTokens = parsed;
    }
  }
  return flags;
}

function value(arg: string): string {
  return arg.slice(arg.indexOf("=") + 1);
}

function printHuman(result: PingResult): void {
  const icon = result.ok ? "✅" : "❌";
  const authMode = result.ok ? result.authMode : undefined;
  const lines = [
    `${icon} ${result.ok ? "ping ok" : "ping failed"}`,
    `   provider : ${result.provider}${authMode ? ` (${authMode})` : ""}`,
    `   model    : ${result.model}`,
    `   message  : ${result.message}`,
    `   latency  : ${result.latencyMs}ms`,
    `   time     : ${result.timestamp}`,
  ];
  if (result.ok) {
    lines.push(`   reply    : ${result.reply || "(empty)"}`);
    if (result.usage) {
      lines.push(
        `   usage    : in=${result.usage.inputTokens ?? "?"} out=${result.usage.outputTokens ?? "?"}`,
      );
    }
  } else {
    lines.push(`   error    : ${result.error}`);
  }
  console.log(lines.join("\n"));
}

function printHelp(): void {
  console.log(
    [
      "session-timer ping — send a tiny message to keep a session window warm",
      "",
      "Usage: npm run ping -- [options]",
      "",
      "Options:",
      "  --dry-run            Do not send a request; just show what would happen",
      `  --provider=<name>    Override PING_PROVIDER (${PROVIDER_NAMES.join(" | ")})`,
      "  --model=<id>         Override PING_MODEL",
      '  --message=<text>     Override PING_MESSAGE (default "hello 👋")',
      "  --max-tokens=<n>     Override PING_MAX_TOKENS (default 16)",
      "  --json               Print the raw JSON result",
      "  --help, -h           Show this help",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
