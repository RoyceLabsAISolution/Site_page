// Direct port of "Decide New vs Existing" (Qualifying-Core.json) slot state
// machine. Logic kept 1:1 with the n8n Code node so behavior matches exactly.

import { SLOTS, SLOT_KEYS, SOURCE_MAP, type Channel, type LeadRow } from "../types";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/;

function isSkip(t: string): boolean {
  return /^(skip|pass|n\/?a|none|not sure|dunno|don'?t ?know|later|prefer not)\b/i.test(
    t.trim()
  );
}

function promptFor(k: string): string {
  return SLOTS.find((s) => s.key === k)?.prompt || "";
}

export interface SlotState {
  filled: Record<string, string>;
  email: string;
  phone: string;
  company_website: string;
  instagram_handle: string;
  company_name: string;
}

export function loadState(rec: LeadRow | null): SlotState {
  let s: SlotState = {
    filled: {},
    email: "",
    phone: "",
    company_website: "",
    instagram_handle: "",
    company_name: "",
  };
  if (!rec) return s;
  try {
    const p = JSON.parse(rec.conversation_answers || "{}");
    if (p && p.filled) s = Object.assign(s, p);
  } catch {
    /* ignore */
  }
  s.email = rec.email || s.email;
  s.phone = rec.phone || s.phone;
  s.company_website = rec.company_website || s.company_website;
  s.instagram_handle = rec.instagram_handle || s.instagram_handle;
  s.company_name = rec.company_name || s.company_name;
  return s;
}

function assign(state: SlotState, key: string, text: string): boolean {
  if (isSkip(text)) {
    state.filled[key] = "(declined)";
    return true;
  }
  if (key === "contact") {
    const em = (text.match(EMAIL_RE) || [])[0];
    const ph = em ? null : (text.match(PHONE_RE) || [])[0];
    if (em) {
      state.email = em;
      state.filled.contact = em;
      return true;
    }
    if (ph && ph.replace(/\D/g, "").length >= 7) {
      state.phone = ph.trim();
      state.filled.contact = ph.trim();
      return true;
    }
    return false;
  }
  if (key === "web_or_social") {
    const isHandle = /^@/.test(text) || !text.includes(".");
    if (isHandle) {
      state.instagram_handle = text.replace(/^@/, "");
    } else {
      state.company_website = text.replace(/^https?:\/\//, "");
    }
    state.filled.web_or_social = text;
    return true;
  }
  if (key === "company_name") {
    state.company_name = text;
  }
  state.filled[key] = text;
  return true;
}

function harvest(state: SlotState, text: string): void {
  if (!text) return;
  if (!state.filled.contact) {
    const em = (text.match(EMAIL_RE) || [])[0];
    if (em) {
      state.email = em;
      state.filled.contact = em;
    } else {
      const ph = (text.match(PHONE_RE) || [])[0];
      if (ph && ph.replace(/\D/g, "").length >= 7) {
        state.phone = ph.trim();
        state.filled.contact = ph.trim();
      }
    }
  }
  if (!state.filled.web_or_social) {
    const url = (
      text.match(
        /\bhttps?:\/\/[^\s]+|\b[\w-]+\.(?:com|io|co|net|org|shop|store|ai|dev|app)\b[^\s]*/i
      ) || []
    )[0];
    const handle = (text.match(/(^|\s)@([A-Za-z0-9._]{2,})/) || [])[0];
    if (url) {
      state.company_website = url.replace(/^https?:\/\//, "").trim();
      state.filled.web_or_social = url.trim();
    } else if (handle) {
      state.instagram_handle = handle.trim().replace(/^.*@/, "");
      state.filled.web_or_social = handle.trim();
    }
  }
  if (!state.filled.budget) {
    const m = text.match(
      /(?:\$|usd|inr|rs\.?|₹|£|€)?\s?(\d[\d,.]*)\s?(k|thousand|m|million)?\s*(?:\/|per\s+|a\s+)?\s*(mo|month|monthly|yr|year|annually)?/i
    );
    const moneyish =
      /\$|\bk\b|budget|month|per month|monthly|\/mo|thousand|million|\bpm\b/i.test(text);
    if (m && moneyish && /\d/.test(m[1])) {
      state.filled.budget = text.trim().slice(0, 60);
    }
  }
  if (!state.filled.timeline) {
    if (/\b(immediately|right now|asap|this week|start now|ready to start|urgent)\b/i.test(text))
      state.filled.timeline = text.trim().slice(0, 60);
    else if (/\b(this month|next month|within a month|30 days)\b/i.test(text))
      state.filled.timeline = text.trim().slice(0, 60);
    else if (/\b(this quarter|next quarter|few months|q[1-4])\b/i.test(text))
      state.filled.timeline = text.trim().slice(0, 60);
    else if (
      /\b(just exploring|just looking|browsing|no rush|not sure yet|someday|eventually)\b/i.test(
        text
      )
    )
      state.filled.timeline = text.trim().slice(0, 60);
  }
  if (!state.filled.need) {
    if (
      /\b(seo|google ads|paid ads|paid search|paid social|facebook ads|instagram ads|meta ads|tiktok|email marketing|leads|website|web design|ecommerce|conversion|branding|content marketing|social media)\b/i.test(
        text
      )
    ) {
      if (text.split(/\s+/).length >= 3) state.filled.need = text.trim().slice(0, 120);
    }
  }
}

function nextUnfilled(state: SlotState): string | undefined {
  return SLOT_KEYS.find((k) => !state.filled[k]);
}

export interface DecideInput {
  channel: Channel;
  external_id: string;
  message_text: string;
  profile_hint?: { company_website?: string; instagram_handle?: string };
  tenant_id: string;
  existing: LeadRow | null;
}

export interface DecideOutput {
  isNew: boolean;
  record_id?: number;
  lead_id?: number;
  status: string;
  reentry?: boolean;
  textToSend: string;
  tenant_id: string;
  channel: Channel;
  source: string;
  company_name: string;
  email: string;
  phone: string;
  company_website: string;
  instagram_handle: string;
  ig_user_id: string;
  session_id: string;
  consent_given: boolean;
  current_step: number;
  slot_data: string;
}

export function decideNewVsExisting(input: DecideInput): DecideOutput {
  const { channel, existing, tenant_id } = input;
  const messageText = (input.message_text || "").trim();
  const profileHint = input.profile_hint || {};
  const source = SOURCE_MAP[channel] || "Website";

  function outEnvelope(state: SlotState, extra: Partial<DecideOutput>): DecideOutput {
    const igVal = channel === "instagram" ? input.external_id || "" : "";
    const sessVal = channel === "website" ? input.external_id || "" : "";
    const base: DecideOutput = {
      isNew: false,
      status: "",
      textToSend: "",
      tenant_id,
      channel,
      source,
      company_name:
        state.company_name && state.company_name !== "(declined)" ? state.company_name : "",
      email: state.email || "",
      phone: state.phone || (channel === "whatsapp" ? input.external_id : ""),
      company_website: state.company_website || "",
      instagram_handle: state.instagram_handle || "",
      ig_user_id: igVal,
      session_id: sessVal,
      consent_given: !!(state.email || state.phone),
      current_step: SLOT_KEYS.filter((k) => state.filled[k]).length,
      slot_data: JSON.stringify({ filled: state.filled }),
    };
    return Object.assign(base, extra);
  }

  // NEW LEAD
  if (!existing) {
    const state = loadState(null);
    if (profileHint.company_website) state.company_website = profileHint.company_website;
    if (profileHint.instagram_handle) state.instagram_handle = profileHint.instagram_handle;
    harvest(state, messageText);
    const nk = nextUnfilled(state);
    return outEnvelope(state, {
      isNew: true,
      status: "Qualifying",
      textToSend: promptFor(nk || "") || "Tell us a bit about what you need.",
    });
  }

  // COMPLETED (re-entry)
  if (["Form Sent", "Scored", "Researched", "Meeting Link Sent", "Meeting Booked"].includes(
    existing.status || ""
  )) {
    const state = loadState(existing);
    return outEnvelope(state, {
      isNew: false,
      record_id: existing.lead_id,
      lead_id: existing.lead_id,
      status: existing.status || "",
      reentry: true,
      textToSend:
        "You're all set — our team will be in touch shortly. Anything else you'd like us to know?",
    });
  }

  // EXISTING, in progress
  const state = loadState(existing);
  const askKey = nextUnfilled(state);
  if (askKey && messageText) {
    assign(state, askKey, messageText);
  }
  harvest(state, messageText);

  const nk = nextUnfilled(state);
  const isDone = !nk;
  return outEnvelope(state, {
    isNew: false,
    record_id: existing.lead_id,
    lead_id: existing.lead_id,
    status: isDone ? "Form Sent" : "Qualifying",
    textToSend: isDone
      ? "Perfect — that's everything we need. Our team will review this and be in touch shortly. Anything else you'd like us to know?"
      : promptFor(nk || ""),
  });
}
