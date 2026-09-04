export interface Env {
  DB: D1Database;
  RATE_LIMIT_PER_MIN: string;
  NVIDIA_NIM_BASE_URL: string;
  NVIDIA_NIM_MODEL: string;
  NVIDIA_NIM_FALLBACK_MODELS?: string; // comma-separated, tried in order if the primary model 404s/410s
  CORS_ALLOWED_ORIGIN: string;
  WORKER_BASE_URL: string; // used to build /leads/:id links in Slack alerts
  // secrets (set via `wrangler secret put`)
  SLACK_WEBHOOK_URL?: string;
  SYSTEM_HEALTH_SLACK_WEBHOOK_URL?: string; // optional separate channel for health-check alerts
  JINA_API_KEY?: string; // optional - raises Jina Reader rate limit from 20 RPM (shared per-IP, easily exhausted on Cloudflare's shared IPs) to 500 RPM (per-key)
  YOUTUBE_API_KEY?: string; // free (Google Cloud, YouTube Data API v3) - enables real channel stat lookups
  APIFY_API_TOKEN?: string; // paid but cheap (~$0.0026/lookup, $5 free credit) - enables real Instagram profile lookups since Instagram blocks direct scraping and its official API needs the lead's own OAuth consent
  ADMIN_PASSWORD?: string; // protects /leads and /leads/:id (HTTP Basic Auth) - see src/lib/adminAuth.ts
  NVIDIA_NIM_API_KEY?: string;
  META_VERIFY_TOKEN?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  META_PAGE_ACCESS_TOKEN?: string; // Instagram send
}

export interface Slot {
  key: string;
  prompt: string;
}

export const SLOTS: Slot[] = [
  { key: "company_name", prompt: "What's your company name?" },
  {
    key: "contact",
    prompt:
      "What's the best email or phone number for us to reach you? (By sharing it, you agree we may contact you about your enquiry.)",
  },
  { key: "need", prompt: "What are you looking to solve or achieve?" },
  { key: "budget", prompt: "What's your rough monthly budget for this?" },
  {
    key: "timeline",
    prompt: "What's your timeline — next month, this quarter, or just exploring?",
  },
  {
    key: "web_or_social",
    prompt: "Last one — what's your website or main Instagram handle?",
  },
];

export const SLOT_KEYS = SLOTS.map((s) => s.key);

export interface LeadRow {
  lead_id: number;
  tenant_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  company_website: string | null;
  linkedin_url: string | null;
  instagram_handle: string | null;
  youtube_channel: string | null;
  source: string | null;
  status: string | null;
  current_step: number | null;
  conversation_answers: string | null;
  form_data: string | null;
  ai_score: number | null;
  ai_tier: string | null;
  ai_summary: string | null;
  ai_key_points: string | null;
  business_research_report: string | null;
  recommended_services: string | null;
  research_talking_points: string | null;
  ig_user_id: string | null;
  session_id: string | null;
  bant_budget: number | null;
  bant_authority: number | null;
  bant_need: number | null;
  bant_timeline: number | null;
  consent_given: number | null;
  role: string | null;
  industry: string | null;
  budget_bracket: string | null;
  timeline_bracket: string | null;
  heard_about: string | null;
  need_description: string | null;
}

export type RoleValue = "owner_founder" | "clevel_director" | "manager" | "employee" | "other";
export type BudgetBracket = "lt_1k" | "1k_5k" | "5k_25k" | "25k_plus" | "not_sure";
export type TimelineBracket = "immediate" | "this_month" | "this_quarter" | "exploring";

export const ROLE_LABELS: Record<RoleValue, string> = {
  owner_founder: "Owner / Founder",
  clevel_director: "C-level / Director",
  manager: "Manager",
  employee: "Employee",
  other: "Other",
};

export const BUDGET_LABELS: Record<BudgetBracket, string> = {
  lt_1k: "Under $1,000/mo",
  "1k_5k": "$1,000 - $5,000/mo",
  "5k_25k": "$5,000 - $25,000/mo",
  "25k_plus": "$25,000+/mo",
  not_sure: "Not sure yet",
};

export const TIMELINE_LABELS: Record<TimelineBracket, string> = {
  immediate: "Immediately / ready to start",
  this_month: "This month",
  this_quarter: "This quarter",
  exploring: "Just exploring",
};

// Maps structured brackets straight to BANT sub-scores (0-25), bypassing the
// LLM for these two dimensions entirely when a form submission is the
// source - the whole point of collecting them as enums instead of free text.
export const BUDGET_BRACKET_SCORE: Record<BudgetBracket, number> = {
  lt_1k: 5,
  "1k_5k": 10,
  "5k_25k": 18,
  "25k_plus": 25,
  not_sure: 0,
};

export const TIMELINE_BRACKET_SCORE: Record<TimelineBracket, number> = {
  immediate: 25,
  this_month: 20,
  this_quarter: 12,
  exploring: 0,
};

// Authority is a strong-but-not-absolute signal from self-reported role -
// still capped below 25 so the LLM's judgment on phrasing/context can adjust
// it slightly rather than being fully overridden by a dropdown.
export const ROLE_AUTHORITY_HINT: Record<RoleValue, number> = {
  owner_founder: 25,
  clevel_director: 22,
  manager: 14,
  employee: 6,
  other: 8,
};

export type Channel = "whatsapp" | "instagram" | "website";

export const FIELD_NAME_BY_CHANNEL: Record<Channel, string> = {
  whatsapp: "phone",
  instagram: "ig_user_id",
  website: "session_id",
};

export const SOURCE_MAP: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  website: "Website",
};
