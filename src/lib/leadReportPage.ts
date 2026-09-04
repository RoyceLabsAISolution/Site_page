// Renders the persistent lead/research report page (GET /leads/:id) that
// the Slack alert links to - gives sales a durable view of the full BANT
// breakdown and research findings instead of only a Slack message that
// scrolls away.

import type { LeadRow } from "../types";
import { ROLE_LABELS, BUDGET_LABELS, TIMELINE_LABELS, type RoleValue, type BudgetBracket, type TimelineBracket } from "../types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tierBadgeColor(tier: string | null): string {
  if (tier === "hot") return "#EF4444";
  if (tier === "warm") return "#F59E0B";
  return "#64748B";
}

function scoreBar(label: string, value: number | null, max = 25): string {
  const v = Math.max(0, Math.min(max, value ?? 0));
  const pct = Math.round((v / max) * 100);
  return `
    <div class="bant-row">
      <span class="bant-label">${label}</span>
      <div class="bant-track"><div class="bant-fill" style="width:${pct}%"></div></div>
      <span class="bant-val">${v}/${max}</span>
    </div>`;
}

export function renderLeadReportPage(rec: LeadRow | null): string {
  if (!rec) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lead not found</title></head>
    <body style="font-family:system-ui;background:#0B1220;color:#EAF1FB;padding:40px;text-align:center;">
      <h1>Lead not found</h1><p style="color:#9FB0C7">This lead ID doesn't exist.</p>
    </body></html>`;
  }

  let keyPoints: string[] = [];
  try {
    keyPoints = JSON.parse(rec.ai_key_points || "[]");
  } catch {
    /* ignore */
  }

  let research: Record<string, string> = {};
  try {
    research = JSON.parse(rec.business_research_report || "{}");
  } catch {
    /* ignore */
  }

  const services = (rec.recommended_services || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const talkingPoints = (rec.research_talking_points || "").split("\n").filter(Boolean);

  const roleLabel = rec.role ? ROLE_LABELS[rec.role as RoleValue] || rec.role : "—";
  const budgetLabel = rec.budget_bracket
    ? BUDGET_LABELS[rec.budget_bracket as BudgetBracket] || rec.budget_bracket
    : "—";
  const timelineLabel = rec.timeline_bracket
    ? TIMELINE_LABELS[rec.timeline_bracket as TimelineBracket] || rec.timeline_bracket
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(rec.company_name || rec.name)} — Lead Report</title>
<meta name="robots" content="noindex" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
:root{
  --navy-850:#0B1220;--navy-800:#0F172A;--slate-400:#64748B;--slate-300:#94A3B8;
  --sky-400:#38BDF8;--sky-600:#0369A1;--border:rgba(148,163,184,.16);
  --fg:#EAF1FB;--fg-muted:#9FB0C7;--font:'Plus Jakarta Sans',system-ui,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--font);background:var(--navy-850);color:var(--fg);line-height:1.6;padding:32px 16px 80px;}
.wrap{max-width:820px;margin:0 auto}
.card{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:18px;padding:clamp(20px,4vw,32px);margin-bottom:20px}
.header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
h1{font-size:1.6rem;font-weight:800;margin:0 0 4px;letter-spacing:-.02em}
.meta{color:var(--fg-muted);font-size:.9rem}
.tier{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .9rem;border-radius:999px;color:#fff}
.score-big{font-size:2.2rem;font-weight:800;letter-spacing:-.02em}
h2{font-size:1rem;text-transform:uppercase;letter-spacing:.06em;color:var(--sky-400);margin:0 0 14px;font-weight:700}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.kv{display:flex;flex-direction:column;gap:2px}
.kv .k{font-size:.78rem;color:var(--slate-400)}
.kv .v{font-size:.95rem}
.bant-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bant-label{width:90px;font-size:.85rem;color:var(--fg-muted);flex:none}
.bant-track{flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}
.bant-fill{height:100%;background:linear-gradient(90deg,var(--sky-400),var(--sky-600));border-radius:99px}
.bant-val{width:42px;text-align:right;font-size:.82rem;color:var(--slate-300);flex:none}
ul{margin:0;padding-left:1.2rem}
li{margin-bottom:6px;font-size:.95rem;color:var(--fg-muted)}
.pill{display:inline-block;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.25);color:var(--sky-400);font-size:.82rem;padding:.3rem .7rem;border-radius:999px;margin:0 6px 6px 0}
.summary{white-space:pre-wrap;font-size:.95rem;color:var(--fg-muted)}
.empty{color:var(--slate-400);font-style:italic;font-size:.9rem}
a.email-link{color:var(--sky-400)}
</style>
</head>
<body>
<div class="wrap">
  <div class="card header">
    <div>
      <h1>${esc(rec.company_name || rec.name || "Unknown")}</h1>
      <div class="meta">${esc(rec.name)} · ${esc(rec.email)}${rec.phone ? " · " + esc(rec.phone) : ""} · Source: ${esc(rec.source)}</div>
    </div>
    <div style="text-align:right">
      <div class="score-big">${rec.ai_score ?? "—"}</div>
      <span class="tier" style="background:${tierBadgeColor(rec.ai_tier)}">${esc(rec.ai_tier) || "unscored"}</span>
    </div>
  </div>

  <div class="card">
    <h2>Lead details</h2>
    <div class="grid2">
      <div class="kv"><span class="k">Role</span><span class="v">${esc(roleLabel)}</span></div>
      <div class="kv"><span class="k">Industry</span><span class="v">${esc(rec.industry) || "—"}</span></div>
      <div class="kv"><span class="k">Budget</span><span class="v">${esc(budgetLabel)}</span></div>
      <div class="kv"><span class="k">Timeline</span><span class="v">${esc(timelineLabel)}</span></div>
      <div class="kv"><span class="k">Website</span><span class="v">${esc(rec.company_website) || "—"}</span></div>
      <div class="kv"><span class="k">Heard about us via</span><span class="v">${esc(rec.heard_about) || "—"}</span></div>
    </div>
    ${rec.need_description ? `<div style="margin-top:16px"><div class="kv"><span class="k">Stated need</span><span class="v">${esc(rec.need_description)}</span></div></div>` : ""}
  </div>

  <div class="card">
    <h2>BANT breakdown</h2>
    ${scoreBar("Budget", rec.bant_budget)}
    ${scoreBar("Authority", rec.bant_authority)}
    ${scoreBar("Need", rec.bant_need)}
    ${scoreBar("Timeline", rec.bant_timeline)}
  </div>

  <div class="card">
    <h2>AI summary</h2>
    <div class="summary">${esc(rec.ai_summary) || '<span class="empty">Not scored yet.</span>'}</div>
    ${keyPoints.length ? `<ul style="margin-top:14px">${keyPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
  </div>

  ${
    research.business_overview
      ? `<div class="card">
    <h2>Business research</h2>
    <p class="summary">${esc(research.business_overview)}</p>
    <div class="grid2" style="margin-top:16px">
      <div class="kv"><span class="k">Website</span><span class="v">${esc(research.website_findings) || "not found"}</span></div>
      <div class="kv"><span class="k">Instagram</span><span class="v">${esc(research.instagram_findings) || "not found"}</span></div>
      <div class="kv"><span class="k">YouTube</span><span class="v">${esc(research.youtube_findings) || "not found"}</span></div>
      <div class="kv"><span class="k">LinkedIn</span><span class="v">${esc(research.linkedin_findings) || "not found"}</span></div>
    </div>
  </div>`
      : ""
  }

  ${
    services.length
      ? `<div class="card">
    <h2>Recommended services</h2>
    <div>${services.map((s) => `<span class="pill">${esc(s)}</span>`).join("")}</div>
  </div>`
      : ""
  }

  ${
    talkingPoints.length
      ? `<div class="card">
    <h2>Talking points for the call</h2>
    <ul>${talkingPoints.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  </div>`
      : ""
  }
</div>
</body>
</html>`;
}
