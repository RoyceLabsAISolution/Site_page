import type { Env, LeadRow, Channel } from "../types";
import { FIELD_NAME_BY_CHANNEL } from "../types";

const VALID_MATCH_FIELDS = new Set(["session_id", "ig_user_id", "phone", "email"]);

export async function searchLead(
  env: Env,
  tenantId: string,
  channel: Channel,
  externalId: string
): Promise<LeadRow | null> {
  const fieldName = FIELD_NAME_BY_CHANNEL[channel] || "session_id";
  const col = VALID_MATCH_FIELDS.has(fieldName) ? fieldName : "session_id";
  const row = await env.DB.prepare(
    `SELECT * FROM leads WHERE tenant_id = ?1 AND ${col} = ?2 ORDER BY lead_id DESC LIMIT 1;`
  )
    .bind(tenantId, String(externalId))
    .first<LeadRow>();
  return row || null;
}

export async function searchLeadById(env: Env, leadId: number): Promise<LeadRow | null> {
  const row = await env.DB.prepare(`SELECT * FROM leads WHERE lead_id = ?1 LIMIT 1;`)
    .bind(leadId)
    .first<LeadRow>();
  return row || null;
}

// Powers the admin /leads dashboard - newest first, capped since D1 has no
// pagination cursor built in here and a lead-qual app is never going to
// need to page through tens of thousands of rows in one view.
export async function listLeads(env: Env, limit = 200): Promise<LeadRow[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM leads ORDER BY lead_id DESC LIMIT ?1;`
  )
    .bind(limit)
    .all<LeadRow>();
  return result.results || [];
}

export interface CreateLeadInput {
  tenant_id: string;
  source: string;
  status: string;
  current_step: number;
  slot_data: string;
  company_website: string;
  instagram_handle: string;
  phone: string;
  ig_user_id: string;
  session_id: string;
  company_name: string;
  email: string;
  consent_given: boolean;
}

export async function createLead(env: Env, d: CreateLeadInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO leads (tenant_id, source, status, current_step, conversation_answers,
       company_website, instagram_handle, phone, ig_user_id, session_id, company_name, email, consent_given)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
     RETURNING lead_id;`
  )
    .bind(
      d.tenant_id,
      d.source,
      d.status,
      d.current_step,
      d.slot_data,
      d.company_website,
      d.instagram_handle,
      d.phone,
      d.ig_user_id,
      d.session_id,
      d.company_name,
      d.email,
      d.consent_given ? 1 : 0
    )
    .first<{ lead_id: number }>();
  return result!.lead_id;
}

// Structured intake form submission (see /form, /form/submit routes).
// Direct-entry lead: skips the slot state machine entirely since every field
// arrives validated and typed from the form in one shot.
export interface CreateFormLeadInput {
  tenant_id: string;
  source: string;
  company_name: string;
  company_website: string;
  industry: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  instagram_handle: string;
  linkedin_url: string;
  youtube_channel: string;
  need_description: string;
  budget_bracket: string;
  timeline_bracket: string;
  heard_about: string;
  consent_given: boolean;
}

export async function createFormLead(env: Env, d: CreateFormLeadInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO leads (
       tenant_id, source, status, company_name, company_website, industry,
       name, email, phone, role, instagram_handle, linkedin_url, youtube_channel,
       need_description, budget_bracket, timeline_bracket, heard_about, consent_given
     ) VALUES (?1,?2,'Form Sent',?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
     RETURNING lead_id;`
  )
    .bind(
      d.tenant_id,
      d.source,
      d.company_name,
      d.company_website,
      d.industry,
      d.name,
      d.email,
      d.phone,
      d.role,
      d.instagram_handle,
      d.linkedin_url,
      d.youtube_channel,
      d.need_description,
      d.budget_bracket,
      d.timeline_bracket,
      d.heard_about,
      d.consent_given ? 1 : 0
    )
    .first<{ lead_id: number }>();
  return result!.lead_id;
}

export interface UpdateLeadInput {
  lead_id: number;
  status: string;
  current_step: number;
  slot_data: string;
  company_website: string;
  instagram_handle: string;
  company_name: string;
  email: string;
  phone: string;
  consent_given: boolean;
}

export async function updateLead(env: Env, d: UpdateLeadInput): Promise<void> {
  await env.DB.prepare(
    `UPDATE leads SET status=?2, current_step=?3, conversation_answers=?4, company_website=?5,
       instagram_handle=?6, company_name=?7, email=?8, phone=?9, consent_given=?10
     WHERE lead_id=?1;`
  )
    .bind(
      d.lead_id,
      d.status,
      d.current_step,
      d.slot_data,
      d.company_website,
      d.instagram_handle,
      d.company_name,
      d.email,
      d.phone,
      d.consent_given ? 1 : 0
    )
    .run();
}

export interface ScoredUpdate {
  lead_id: number;
  ai_score: number;
  ai_tier: string;
  ai_summary: string;
  ai_key_points: string;
  bant_budget: number;
  bant_authority: number;
  bant_need: number;
  bant_timeline: number;
}

export async function updateLeadScored(env: Env, d: ScoredUpdate): Promise<void> {
  await env.DB.prepare(
    `UPDATE leads SET ai_score=?2, ai_tier=?3, ai_summary=?4, ai_key_points=?5,
       bant_budget=?6, bant_authority=?7, bant_need=?8, bant_timeline=?9, status='Scored'
     WHERE lead_id=?1;`
  )
    .bind(
      d.lead_id,
      d.ai_score,
      d.ai_tier,
      d.ai_summary,
      d.ai_key_points,
      d.bant_budget,
      d.bant_authority,
      d.bant_need,
      d.bant_timeline
    )
    .run();
}

export interface ResearchedUpdate {
  lead_id: number;
  business_research_report: string;
  recommended_services: string;
  research_talking_points: string;
}

export async function updateLeadResearched(env: Env, d: ResearchedUpdate): Promise<void> {
  await env.DB.prepare(
    `UPDATE leads SET business_research_report=?2, recommended_services=?3,
       research_talking_points=?4, status='Researched' WHERE lead_id=?1;`
  )
    .bind(d.lead_id, d.business_research_report, d.recommended_services, d.research_talking_points)
    .run();
}

export async function logEvent(
  env: Env,
  tenantId: string,
  leadId: number | null,
  eventType: string,
  detail: unknown
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO events (tenant_id, lead_id, event_type, detail) VALUES (?1, ?2, ?3, ?4);`
    )
      .bind(tenantId, leadId, eventType, JSON.stringify(detail))
      .run();
  } catch {
    // non-fatal, matches onError=continueRegularOutput in the n8n version
  }
}

// Atomic per-tenant/session rate limit, 1-minute sliding window.
// SQLite/D1 has no INSERT..ON CONFLICT..RETURNING race-free upsert story identical to
// Postgres under concurrency, but D1's serialized writes per-database make this safe
// in practice for this workload.
export async function checkRateLimit(
  env: Env,
  tenantId: string,
  sessionKey: string,
  limitPerMin: number
): Promise<{ allowed: boolean; count: number }> {
  const nowIso = new Date().toISOString();
  const existing = await env.DB.prepare(
    `SELECT count, window_start FROM rate_limits WHERE tenant_id=?1 AND session_key=?2;`
  )
    .bind(tenantId, sessionKey)
    .first<{ count: number; window_start: string }>();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO rate_limits (tenant_id, session_key, window_start, count) VALUES (?1,?2,?3,1);`
    )
      .bind(tenantId, sessionKey, nowIso)
      .run();
    return { allowed: true, count: 1 };
  }

  const windowStartMs = new Date(existing.window_start + "Z").getTime();
  const expired = Date.now() - windowStartMs > 60_000;
  const newCount = expired ? 1 : existing.count + 1;
  const newWindowStart = expired ? nowIso : existing.window_start;

  await env.DB.prepare(
    `UPDATE rate_limits SET count=?3, window_start=?4 WHERE tenant_id=?1 AND session_key=?2;`
  )
    .bind(tenantId, sessionKey, newCount, newWindowStart)
    .run();

  return { allowed: newCount <= limitPerMin, count: newCount };
}

// Webhook redelivery dedup (WhatsApp/Instagram) - replaces n8n's
// $getWorkflowStaticData('global') in-memory cache, which has no equivalent
// in Workers (no persistent memory across requests/isolates).
// Returns true if this message_id has already been processed (i.e. it's a
// duplicate delivery that should be dropped).
export async function isDuplicateMessage(
  env: Env,
  channel: string,
  messageId: string
): Promise<boolean> {
  const existing = await env.DB.prepare(
    `SELECT 1 FROM processed_messages WHERE channel=?1 AND message_id=?2;`
  )
    .bind(channel, messageId)
    .first();
  if (existing) return true;

  try {
    await env.DB.prepare(
      `INSERT INTO processed_messages (channel, message_id) VALUES (?1, ?2);`
    )
      .bind(channel, messageId)
      .run();
  } catch {
    // Unique constraint race (near-simultaneous redelivery) - treat as duplicate.
    return true;
  }
  return false;
}

// Hybrid FAQ <-> qualifying chat session state (roycelabs.pages.dev widget).
export interface ChatSessionRow {
  session_id: string;
  tenant_id: string;
  mode: "faq" | "qualifying";
  lead_id: number | null;
}

export async function getOrCreateChatSession(
  env: Env,
  sessionId: string,
  tenantId: string
): Promise<ChatSessionRow> {
  const existing = await env.DB.prepare(`SELECT * FROM chat_sessions WHERE session_id=?1;`)
    .bind(sessionId)
    .first<ChatSessionRow>();
  if (existing) return existing;

  await env.DB.prepare(
    `INSERT INTO chat_sessions (session_id, tenant_id, mode) VALUES (?1, ?2, 'faq');`
  )
    .bind(sessionId, tenantId)
    .run();
  return { session_id: sessionId, tenant_id: tenantId, mode: "faq", lead_id: null };
}

export async function setChatSessionQualifying(
  env: Env,
  sessionId: string
): Promise<void> {
  await env.DB.prepare(
    `UPDATE chat_sessions SET mode='qualifying', updated_at=datetime('now') WHERE session_id=?1;`
  )
    .bind(sessionId)
    .run();
}
