// Orchestrates the full Qualifying-Core.json flow:
//   rate limit -> search lead -> decide new/existing -> create/update -> maybe fire scoring

import type { Env, Channel } from "../types";
import { checkRateLimit, searchLead, createLead, updateLead, logEvent } from "./db";
import { decideNewVsExisting } from "./qualifyingCore";

export interface QualifyInput {
  channel: Channel;
  external_id: string;
  message_text: string;
  tenant_id?: string;
  profile_hint?: { company_website?: string; instagram_handle?: string };
}

export interface QualifyResult {
  action: "send";
  text: string;
  lead_id?: number;
  rateLimited?: boolean;
}

export async function runQualifyingCore(
  env: Env,
  input: QualifyInput,
  onQualifiedComplete?: (leadId: number) => void
): Promise<QualifyResult> {
  const tenantId = input.tenant_id || "default";
  const rateLimitPerMin = parseInt(env.RATE_LIMIT_PER_MIN, 10) || 20;

  const rl = await checkRateLimit(env, tenantId, input.external_id || "unknown", rateLimitPerMin);
  if (!rl.allowed) {
    return {
      action: "send",
      text: "You're sending messages a bit too fast — please wait a moment and try again.",
      rateLimited: true,
    };
  }

  const existing = await searchLead(env, tenantId, input.channel, input.external_id);

  const decided = decideNewVsExisting({
    channel: input.channel,
    external_id: input.external_id,
    message_text: input.message_text,
    profile_hint: input.profile_hint,
    tenant_id: tenantId,
    existing,
  });

  let leadId: number;
  if (decided.isNew) {
    leadId = await createLead(env, {
      tenant_id: decided.tenant_id,
      source: decided.source,
      status: decided.status,
      current_step: decided.current_step,
      slot_data: decided.slot_data,
      company_website: decided.company_website,
      instagram_handle: decided.instagram_handle,
      phone: decided.phone,
      ig_user_id: decided.ig_user_id,
      session_id: decided.session_id,
      company_name: decided.company_name,
      email: decided.email,
      consent_given: decided.consent_given,
    });
  } else {
    leadId = decided.lead_id!;
    if (!decided.reentry) {
      await updateLead(env, {
        lead_id: leadId,
        status: decided.status,
        current_step: decided.current_step,
        slot_data: decided.slot_data,
        company_website: decided.company_website,
        instagram_handle: decided.instagram_handle,
        company_name: decided.company_name,
        email: decided.email,
        phone: decided.phone,
        consent_given: decided.consent_given,
      });
    }
  }

  // "Is Conversation Done?" -> fire scoring async + log event, matching
  // waitForSubWorkflow=false in the source workflow (fire-and-forget).
  if (decided.status === "Form Sent") {
    await logEvent(env, tenantId, leadId, "qualified_complete", {
      source: decided.source,
      current_step: decided.current_step,
    });
    onQualifiedComplete?.(leadId);
  }

  return { action: "send", text: decided.textToSend, lead_id: leadId };
}
