import { loadConfig } from "@/core";

/**
 * Static status page. Intentionally does NOT trigger a ping on load (that would
 * cost tokens / hit the API on every page view). It only reflects the resolved
 * configuration and how to trigger the endpoint.
 */
export default function Home() {
  const config = loadConfig();
  const schedule = process.env.CRON_SCHEDULE_DISPLAY ?? "see vercel.json";
  const authMode = process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN
    ? "oauth (subscription)"
    : process.env.ANTHROPIC_API_KEY
      ? "api-key"
      : "no credentials configured";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>👋 Agent Session Timer</h1>
      <p style={{ color: "#a1a1ad", marginTop: 0 }}>
        A tiny scheduled ping that keeps a session window warm so you never sit
        idle on the timer.
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#a1a1ad" }}>Resolved config</h2>
        <Row label="provider" value={config.provider} />
        <Row label="model" value={config.model ?? "(provider default)"} />
        <Row label="message" value={config.message} />
        <Row label="max tokens" value={String(config.maxTokens)} />
        <Row label="auth" value={authMode} />
        <Row label="schedule" value={schedule} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#a1a1ad" }}>Trigger</h2>
        <pre style={pre}>{`# scheduled automatically by Vercel Cron -> /api/cron

# manual (with CRON_SECRET set):
curl -H "Authorization: Bearer $CRON_SECRET" \\
  https://<your-app>/api/cron

# dry run (no request sent):
curl -H "Authorization: Bearer $CRON_SECRET" \\
  "https://<your-app>/api/cron?dryRun=1"`}</pre>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.15rem 0" }}>
      <span style={{ color: "#6f6f7b", width: 110, flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const pre: React.CSSProperties = {
  background: "#15151c",
  border: "1px solid #26262f",
  borderRadius: 8,
  padding: "1rem",
  overflowX: "auto",
  fontSize: "0.85rem",
};
