import { NextResponse } from "next/server";

import { ping } from "@/core";

/**
 * Cron ingress endpoint.
 *
 * Vercel Cron hits this on the schedule in `vercel.json`. When CRON_SECRET is
 * set, Vercel sends it as `Authorization: Bearer <CRON_SECRET>` automatically,
 * and we require it here so the endpoint can't be triggered by anyone.
 *
 * Manual testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron
 *   curl -H "Authorization: Bearer $CRON_SECRET" "https://<app>/api/cron?dryRun=1"
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = isTruthy(url.searchParams.get("dryRun"));

  const result = await ping(dryRun ? { dryRun: true } : {});

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

// Allow POST too, so the endpoint can be triggered by webhooks / manual curl -X POST.
export const POST = GET;

function authorize(request: Request): { ok: true } | { ok: false; error: string } {
  const secret = process.env.CRON_SECRET;

  // No secret configured -> open (convenient for local dev). Loudly documented
  // in the README; set CRON_SECRET in production.
  if (!secret) return { ok: true };

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return { ok: true };

  return { ok: false, error: "unauthorized" };
}

function isTruthy(value: string | null): boolean {
  return value !== null && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
