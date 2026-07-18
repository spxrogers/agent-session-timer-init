#!/usr/bin/env node
import "dotenv/config";

import { ping, type PingConfig, type PingResult, type ProviderName } from "./core";

/**
 * Scriptable entry point.
 *
 *   npm run ping                         # real ping using env config
 *   npm run ping -- --dry-run            # no network call (smoke test)
 *   npm run ping -- --provider=anthropic --model=claude-haiku-4-5
 *   npm run ping -- --message="hi 👋" --json
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  const overrides: Partial<PingConfig> = {};
  if (flags.dryRun) overrides.dryRun = true;
  if (flags.provider) overrides.provider = flags.provider;
  if (flags.model) overrides.model = flags.model;
  if (flags.message) overrides.message = flags.message;

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
  provider?: ProviderName;
  model?: string;
  message?: string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, json: false, help: false };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--json") flags.json = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg.startsWith("--provider=")) flags.provider = value(arg) as ProviderName;
    else if (arg.startsWith("--model=")) flags.model = value(arg);
    else if (arg.startsWith("--message=")) flags.message = value(arg);
  }
  return flags;
}

function value(arg: string): string {
  return arg.slice(arg.indexOf("=") + 1);
}

function printHuman(result: PingResult): void {
  const icon = result.ok ? "✅" : "❌";
  const lines = [
    `${icon} ${result.ok ? "ping ok" : "ping failed"}`,
    `   provider : ${result.provider}${result.authMode ? ` (${result.authMode})` : ""}`,
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
      "  --provider=<name>    Override PING_PROVIDER (anthropic | openai)",
      "  --model=<id>         Override PING_MODEL",
      '  --message=<text>     Override PING_MESSAGE (default "hello 👋")',
      "  --json               Print the raw JSON result",
      "  --help, -h           Show this help",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
