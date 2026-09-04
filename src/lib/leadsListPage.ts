// Renders the admin leads dashboard (GET /leads) - a sortable table of all
// leads with links to each full report page, plus a CSV export link.
// Password-protected (see adminAuth.ts).

import type { LeadRow } from "../types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tierColor(tier: string | null): string {
  if (tier === "hot") return "#EF4444";
  if (tier === "warm") return "#F59E0B";
  if (tier === "cold") return "#64748B";
  return "#334155";
}

export function renderLeadsListPage(leads: LeadRow[]): string {
  const rows = leads
    .map((l) => {
      const scoreDisplay = l.ai_score != null ? l.ai_score : "—";
      const tierDisplay = l.ai_tier || "unscored";
      return `<tr>
        <td>${l.lead_id}</td>
        <td><a href="/leads/${l.lead_id}">${esc(l.company_name) || esc(l.name) || "(unnamed)"}</a></td>
        <td>${esc(l.name)}</td>
        <td>${esc(l.email)}</td>
        <td>${esc(l.source)}</td>
        <td><span class="score">${scoreDisplay}</span></td>
        <td><span class="tier" style="background:${tierColor(l.ai_tier)}">${esc(tierDisplay)}</span></td>
        <td>${esc(l.status)}</td>
        <td class="muted">${esc((l as unknown as { created_at?: string }).created_at || "")}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Leads — Royce Labs Admin</title>
<meta name="robots" content="noindex" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
:root{
  --navy-850:#0B1220;--navy-800:#0F172A;--slate-400:#64748B;--slate-300:#94A3B8;
  --sky-400:#38BDF8;--sky-600:#0369A1;--border:rgba(148,163,184,.16);
  --fg:#EAF1FB;--fg-muted:#9FB0C7;--font:'Plus Jakarta Sans',system-ui,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--font);background:var(--navy-850);color:var(--fg);padding:24px;}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
h1{font-size:1.4rem;font-weight:800;margin:0;letter-spacing:-.02em}
.count{color:var(--fg-muted);font-size:.9rem;margin-top:2px}
.actions a{color:var(--sky-400);text-decoration:none;font-size:.9rem;font-weight:600;border:1px solid var(--border);padding:.5rem 1rem;border-radius:999px}
.actions a:hover{border-color:var(--sky-400)}
.table-wrap{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:14px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.9rem;min-width:900px}
th{text-align:left;padding:.75rem 1rem;color:var(--slate-400);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:.7rem 1rem;border-bottom:1px solid rgba(148,163,184,.08);white-space:nowrap}
tr:hover td{background:rgba(255,255,255,.02)}
a{color:var(--sky-400);text-decoration:none}
a:hover{text-decoration:underline}
.muted{color:var(--slate-400);font-size:.82rem}
.score{font-weight:700}
.tier{display:inline-block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#fff;padding:.2rem .6rem;border-radius:999px}
.empty{padding:3rem;text-align:center;color:var(--slate-400)}
</style>
</head>
<body>
<div class="top">
  <div>
    <h1>Leads</h1>
    <div class="count">${leads.length} lead${leads.length === 1 ? "" : "s"}</div>
  </div>
  <div class="actions">
    <a href="/leads.csv">Export CSV</a>
  </div>
</div>
<div class="table-wrap">
  ${
    leads.length === 0
      ? `<div class="empty">No leads yet.</div>`
      : `<table>
    <thead>
      <tr>
        <th>ID</th><th>Company</th><th>Contact</th><th>Email</th><th>Source</th>
        <th>Score</th><th>Tier</th><th>Status</th><th>Created</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`
  }
</div>
</body>
</html>`;
}

export function renderLeadsCsv(leads: LeadRow[]): string {
  const headers = [
    "lead_id",
    "company_name",
    "name",
    "email",
    "phone",
    "role",
    "industry",
    "source",
    "status",
    "ai_score",
    "ai_tier",
    "budget_bracket",
    "timeline_bracket",
    "need_description",
  ];
  const escCsv = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const l of leads) {
    lines.push(headers.map((h) => escCsv((l as unknown as Record<string, unknown>)[h])).join(","));
  }
  return lines.join("\n");
}
