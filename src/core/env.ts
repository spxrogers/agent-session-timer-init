/**
 * Small env-parsing helpers shared by config and providers.
 *
 * Empty/whitespace values are always treated as unset — this matters because
 * GitHub Actions expands an unset `vars.*` / mapped secret to `""`.
 */

/**
 * Returns the value, or undefined if it's absent, empty, or whitespace-only.
 * With `{ trim: true }` the returned value is trimmed too — use that for
 * credentials, so a trailing newline in a copied token/secret never reaches an
 * Authorization header. Without it the original value is preserved (so a
 * message like "hi " keeps intentional spacing).
 */
export function envValue(
  raw: string | undefined,
  { trim = false }: { trim?: boolean } = {},
): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  return trim ? trimmed : raw;
}

export function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function boolFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}
