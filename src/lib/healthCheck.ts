// Scheduled health check (Cron Trigger, see wrangler.toml [triggers]).
// Verifies the two things most likely to silently break the whole pipeline
// (D1 connectivity, NVIDIA NIM model availability - both have already
// caused real incidents this project, see README "Model note" and the BOM
// secret-corruption issue) WITHOUT touching the real leads table or firing
// a real Slack lead alert. Runs a real (but minimal) NIM completion through
// the exact same callNimStructured() + fallback path used by real scoring,
// so this genuinely proves "scoring works right now," not just "the API key
// is valid."

import type { Env } from "../types";
import { callNimStructured } from "./nim";

interface HealthCheckResult {
  ok: boolean;
  checks: {
    d1: { ok: boolean; error?: string; latencyMs?: number };
    nim: { ok: boolean; error?: string; latencyMs?: number; modelUsed?: string };
  };
}

const PING_SCHEMA = {
  type: "object",
  properties: { status: { type: "string" } },
  required: ["status"],
};

async function checkD1(env: Env): Promise<HealthCheckResult["checks"]["d1"]> {
  const start = Date.now();
  try {
    await env.DB.prepare("SELECT 1;").first();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: String(err), latencyMs: Date.now() - start };
  }
}

async function checkNim(env: Env): Promise<HealthCheckResult["checks"]["nim"]> {
  const start = Date.now();
  try {
    const result = await callNimStructured<{ status: string }>(
      env,
      "You are a health check endpoint. Respond with exactly {\"status\": \"ok\"}.",
      "ping",
      PING_SCHEMA,
      { maxTries: 2, waitMs: 1000 }
    );
    return { ok: result.status === "ok" || !!result.status, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: String(err), latencyMs: Date.now() - start };
  }
}

export async function runHealthCheck(env: Env): Promise<HealthCheckResult> {
  const [d1, nim] = await Promise.all([checkD1(env), checkNim(env)]);
  return { ok: d1.ok && nim.ok, checks: { d1, nim } };
}

// Posts to a dedicated health-alert Slack webhook if configured, otherwise
// falls back to the main lead-alert webhook with a clearly distinct
// "SYSTEM HEALTH ALERT" prefix so it can't be confused with a real lead.
// Set SYSTEM_HEALTH_SLACK_WEBHOOK_URL (a separate #system-alerts channel's
// Incoming Webhook) via `wrangler secret put` for proper separation.
export async function postHealthAlert(env: Env, result: HealthCheckResult): Promise<void> {
  const webhookUrl = env.SYSTEM_HEALTH_SLACK_WEBHOOK_URL || env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("postHealthAlert: no Slack webhook configured, health failure not reported:", result);
    return;
  }

  const failedChecks = Object.entries(result.checks)
    .filter(([, c]) => !c.ok)
    .map(([name, c]) => `• *${name.toUpperCase()}*: ${c.error || "unknown failure"}`)
    .join("\n");

  const body = {
    text: `🚨 SYSTEM HEALTH ALERT — leadqual-worker`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🚨 SYSTEM HEALTH ALERT" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*leadqual-worker* failed its scheduled health check.\n\n${failedChecks}\n\nLeads may not be scoring correctly right now. Check \`wrangler tail\` for details.`,
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`postHealthAlert: Slack returned HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`postHealthAlert: fetch failed: ${String(err)}`);
  }
}
