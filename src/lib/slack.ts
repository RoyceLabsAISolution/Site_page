// Port of "Build Slack Blocks" + "Post Slack Alert" from AI-Scoring-And-Notify.json.

import type { Env } from "../types";

export interface SlackLeadData {
  lead_id?: number;
  name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  source?: string;
  ai_score?: number | null;
  ai_tier?: string | null;
  ai_summary?: string | null;
  ai_key_points?: string | null; // JSON string array
  business_overview?: string;
  website_findings?: string;
  instagram_findings?: string;
  youtube_findings?: string;
  linkedin_findings?: string;
  recommended_services?: string[] | string;
  talking_points?: string[];
}

export function buildSlackBlocks(
  d: SlackLeadData,
  opts: { reportUrl?: string } = {}
): { blocks: unknown[]; fallbackText: string } {
  const name = d.name || d.company_name || "Unknown";
  const points = (() => {
    try {
      return JSON.parse(d.ai_key_points || "[]");
    } catch {
      return [];
    }
  })();
  const services = Array.isArray(d.recommended_services)
    ? d.recommended_services
    : d.recommended_services
    ? [d.recommended_services]
    : [];
  const talking = Array.isArray(d.talking_points) ? d.talking_points : [];
  const researchOk = !!d.business_overview;

  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: `New ${(d.ai_tier || "").toUpperCase()} Lead: ${name}` } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Source:*\n${d.source || ""}` },
        { type: "mrkdwn", text: `*Score:*\n${d.ai_score != null ? d.ai_score : ""} (${d.ai_tier || ""})` },
        { type: "mrkdwn", text: `*Email:*\n${d.email || "n/a"}` },
        { type: "mrkdwn", text: `*Phone:*\n${d.phone || "n/a"}` },
      ],
    },
    { type: "section", text: { type: "mrkdwn", text: `*Qualification summary:*\n${d.ai_summary || ""}` } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Key points:*\n${points.map((p: string) => `• ${p}`).join("\n") || "• (none)"}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: researchOk
          ? `*Business overview:*\n${d.business_overview}`
          : `*Business research:* _not available (will retry / enrich later)_`,
      },
    },
  ];

  if (researchOk) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Digital presence:*\n• Website: ${d.website_findings || "not found"}\n• Instagram: ${
          d.instagram_findings || "not found"
        }\n• YouTube: ${d.youtube_findings || "not found"}\n• LinkedIn: ${d.linkedin_findings || "not found"}`,
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recommended services:*\n${services.map((s) => `• ${s}`).join("\n") || "• (none)"}`,
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Talking points:*\n${talking.map((t) => `• ${t}`).join("\n") || "• (none)"}`,
      },
    });
  }

  if (opts.reportUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open full lead report" },
          url: opts.reportUrl,
          style: "primary",
        },
      ],
    });
  }

  return { blocks, fallbackText: `New ${d.ai_tier} lead: ${name}` };
}

export async function postSlackAlert(
  env: Env,
  d: SlackLeadData,
  opts: { reportUrl?: string } = {}
): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) {
    console.warn("postSlackAlert: SLACK_WEBHOOK_URL not set - alert not sent.");
    return;
  }
  const { blocks, fallbackText } = buildSlackBlocks(d, opts);
  try {
    const res = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: fallbackText, blocks }),
    });
    if (!res.ok) {
      // Log loudly instead of swallowing silently - a bad webhook URL/token
      // should be visible in `wrangler tail`, even though we still don't
      // throw (matches onError=continueRegularOutput in the source workflow).
      console.error(`postSlackAlert: Slack returned HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`postSlackAlert: fetch failed: ${String(err)}`);
    // onError=continueRegularOutput in the source workflow - never fatal.
  }
}
