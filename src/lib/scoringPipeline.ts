// Orchestrates the full AI-Scoring-And-Notify.json flow:
//   search lead -> prepare input -> score (LLM) -> update DB -> if hot/warm -> research -> slack

import type { Env } from "../types";
import { searchLeadById, updateLeadScored, updateLeadResearched, logEvent } from "./db";
import {
  prepareAgentInput,
  scoreLead,
  bantSummaryLine,
  structuredScoreFloor,
  applyStructuredFloor,
} from "./scoring";
import { researchLead } from "./research";
import { postSlackAlert } from "./slack";

export async function runScoringPipeline(env: Env, leadId: number): Promise<void> {
  const rec = await searchLeadById(env, leadId);
  if (!rec) {
    console.error(`runScoringPipeline: lead ${leadId} not found`);
    return;
  }

  const { agentInputText } = prepareAgentInput(rec);
  const rawScore = await scoreLead(env, agentInputText);
  const floor = structuredScoreFloor(rec);
  const s = applyStructuredFloor(rawScore, floor);
  const summaryWithBant = bantSummaryLine(s);
  const aiKeyPoints = JSON.stringify(s.key_points || []);

  await updateLeadScored(env, {
    lead_id: leadId,
    ai_score: s.score,
    ai_tier: s.tier,
    ai_summary: summaryWithBant,
    ai_key_points: aiKeyPoints,
    bant_budget: s.budget_score ?? 0,
    bant_authority: s.authority_score ?? 0,
    bant_need: s.need_score ?? 0,
    bant_timeline: s.timeline_score ?? 0,
  });

  await logEvent(env, rec.tenant_id, leadId, "scored", {
    score: s.score,
    tier: s.tier,
    bant: {
      b: s.budget_score,
      a: s.authority_score,
      n: s.need_score,
      t: s.timeline_score,
    },
  });

  const baseSlackData = {
    lead_id: leadId,
    name: rec.name || rec.company_name || undefined,
    phone: rec.phone || undefined,
    email: rec.email || undefined,
    source: rec.source || undefined,
    ai_score: s.score,
    ai_tier: s.tier,
    ai_summary: summaryWithBant,
    ai_key_points: aiKeyPoints,
  };

  if (s.tier === "cold") {
    // Stop (Cold Lead) - no research, no Slack alert, matches source workflow.
    return;
  }

  // Research is non-fatal: a failure here must never block the Slack alert.
  let researchData: Partial<import("./research").ResearchResult> = {};
  try {
    const research = await researchLead(env, {
      company_name: rec.company_name || undefined,
      company_website: rec.company_website || undefined,
      instagram_handle: rec.instagram_handle || undefined,
      linkedin_url: rec.linkedin_url || undefined,
      youtube_channel: rec.youtube_channel || undefined,
    });

    await updateLeadResearched(env, {
      lead_id: leadId,
      business_research_report: JSON.stringify({
        business_overview: research.business_overview,
        website_findings: research.website_findings,
        instagram_findings: research.instagram_findings,
        youtube_findings: research.youtube_findings,
        linkedin_findings: research.linkedin_findings,
        recommendation_reasoning: research.recommendation_reasoning,
      }),
      recommended_services: Array.isArray(research.recommended_services)
        ? research.recommended_services.join(", ")
        : research.recommended_services || "",
      research_talking_points: Array.isArray(research.talking_points)
        ? research.talking_points.join("\n")
        : "",
    });

    researchData = research;
  } catch (err) {
    console.error(`Research failed for lead ${leadId} (non-fatal):`, err);
  }

  await postSlackAlert(env, { ...baseSlackData, ...researchData }, {
    reportUrl: `${env.WORKER_BASE_URL}/leads/${leadId}`,
  });

  // Booking-link send (WhatsApp/email) is intentionally omitted: disabled in
  // the source workflow (no WhatsApp/SMTP credentials configured there either).
}
