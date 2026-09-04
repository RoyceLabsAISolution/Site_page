// Serves the structured lead-intake form (GET /form) and handles its
// submission (POST /form/submit). Worker-hosted so it's portable/embeddable
// (iframe, direct link) for any future tenant, not baked into a specific
// static site - the "pure product" requirement.

import type {
  RoleValue,
  BudgetBracket,
  TimelineBracket,
} from "../types";
import {
  ROLE_LABELS,
  BUDGET_LABELS,
  TIMELINE_LABELS,
} from "../types";

function optionsHtml<T extends string>(labels: Record<T, string>, placeholder: string): string {
  const opts = Object.entries(labels)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("\n");
  return `<option value="" disabled selected>${placeholder}</option>\n${opts}`;
}

export function renderFormPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Get your free AI automation assessment — Royce Labs</title>
<meta name="robots" content="noindex" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
:root{
  --navy-900:#070C16;--navy-850:#0B1220;--navy-800:#0F172A;--navy-700:#152036;
  --slate-400:#64748B;--slate-300:#94A3B8;--slate-200:#CBD5E1;
  --sky-400:#38BDF8;--sky-500:#0EA5E9;--sky-600:#0369A1;
  --border:rgba(148,163,184,.16);--border-strong:rgba(148,163,184,.3);
  --fg:#EAF1FB;--fg-muted:#9FB0C7;
  --font:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
}
*{box-sizing:border-box}
body{
  margin:0;font-family:var(--font);background:var(--navy-850);color:var(--fg);
  line-height:1.6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 16px;
  background-image:radial-gradient(1000px 500px at 85% -10%,rgba(3,105,161,.18),transparent 60%),radial-gradient(800px 400px at -10% 100%,rgba(56,189,248,.08),transparent 55%);
}
.card{
  width:100%;max-width:560px;background:rgba(255,255,255,.03);border:1px solid var(--border);
  border-radius:20px;padding:clamp(24px,5vw,40px);box-shadow:0 20px 50px -20px rgba(2,8,23,.7);
}
h1{font-size:1.5rem;font-weight:800;margin:0 0 6px;letter-spacing:-.02em}
.sub{color:var(--fg-muted);font-size:.95rem;margin:0 0 28px}
label{display:block;font-size:.85rem;font-weight:600;color:var(--slate-200);margin-bottom:6px}
.req{color:var(--sky-400)}
.field{margin-bottom:18px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
input,select,textarea{
  width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;
  padding:.65rem .85rem;color:var(--fg);font:inherit;font-size:.95rem;outline:none;transition:border-color .2s;
}
input:focus,select:focus,textarea:focus{border-color:var(--sky-400)}
textarea{resize:vertical;min-height:80px}
select{cursor:pointer}
select option{color:#000}
.hint{font-size:.78rem;color:var(--slate-400);margin-top:4px}
.consent{display:flex;align-items:flex-start;gap:10px;font-size:.85rem;color:var(--fg-muted);margin:20px 0}
.consent input{width:auto;margin-top:3px;flex:none}
button{
  width:100%;padding:.85rem 1.5rem;border-radius:999px;border:0;cursor:pointer;font-weight:700;font-size:1rem;
  color:#001018;background:linear-gradient(135deg,var(--sky-400),var(--sky-600));
  box-shadow:0 10px 30px -10px rgba(14,165,233,.6);transition:transform .2s,opacity .2s;
}
button:hover{transform:translateY(-1px)}
button:disabled{opacity:.6;cursor:not-allowed;transform:none}
.msg{margin-top:16px;font-size:.9rem;padding:.75rem 1rem;border-radius:10px;display:none}
.msg.error{display:block;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#FCA5A5}
.msg.success{display:block;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.25);color:var(--sky-400)}
.section-title{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--sky-400);margin:26px 0 14px;padding-top:14px;border-top:1px solid var(--border)}
.section-title:first-of-type{margin-top:0;padding-top:0;border-top:0}
.hp{position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden}
@media(max-width:520px){.row2{grid-template-columns:1fr}}
</style>
</head>
<body>
<form class="card" id="leadForm" novalidate>
  <h1>Get your free AI automation assessment</h1>
  <p class="sub">Tell us about your business — we'll research your current setup and come back with a specific plan, not a generic pitch.</p>

  <!-- Honeypot: invisible to real visitors, bots that auto-fill every field
       will populate this. Named to look attractive to bots ("website" is a
       common autofill target), positioned off-screen rather than
       display:none (some bots specifically skip display:none fields). -->
  <div class="hp" aria-hidden="true">
    <label for="website">Website</label>
    <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
  </div>
  <input type="hidden" id="form_rendered_at" name="form_rendered_at" />

  <div class="section-title">About your business</div>
  <div class="field">
    <label for="company_name">Company name <span class="req">*</span></label>
    <input type="text" id="company_name" name="company_name" required maxlength="200" />
  </div>
  <div class="row2">
    <div class="field">
      <label for="company_website">Website <span class="req">*</span></label>
      <input type="text" id="company_website" name="company_website" required placeholder="yourcompany.com" maxlength="200" />
    </div>
    <div class="field">
      <label for="industry">Industry</label>
      <input type="text" id="industry" name="industry" placeholder="e.g. dental clinic" maxlength="120" />
    </div>
  </div>
  <p class="hint social-hint">Please provide at least one social profile below so we can research your online presence — Instagram or LinkedIn. <span class="req">*</span></p>
  <div class="field">
    <label for="instagram_handle">Instagram handle</label>
    <input type="text" id="instagram_handle" name="instagram_handle" placeholder="@yourbrand" maxlength="120" class="social-input" />
  </div>
  <div class="field">
    <label for="linkedin_url">LinkedIn company page</label>
    <input type="text" id="linkedin_url" name="linkedin_url" maxlength="200" class="social-input" />
  </div>
  <div class="msg error" id="socialErr" style="display:none">Please fill in at least one of Instagram or LinkedIn.</div>

  <div class="section-title">Your contact details</div>
  <div class="row2">
    <div class="field">
      <label for="name">Your name <span class="req">*</span></label>
      <input type="text" id="name" name="name" required maxlength="120" />
    </div>
    <div class="field">
      <label for="role">Your role <span class="req">*</span></label>
      <select id="role" name="role" required>
        ${optionsHtml<RoleValue>(ROLE_LABELS, "Select your role")}
      </select>
    </div>
  </div>
  <div class="row2">
    <div class="field">
      <label for="email">Email <span class="req">*</span></label>
      <input type="email" id="email" name="email" required maxlength="320" />
    </div>
    <div class="field">
      <label for="phone">Phone (optional)</label>
      <input type="tel" id="phone" name="phone" maxlength="40" />
    </div>
  </div>

  <div class="section-title">What you need</div>
  <div class="field">
    <label for="need_description">What are you looking to solve or achieve? <span class="req">*</span></label>
    <textarea id="need_description" name="need_description" required maxlength="1000" placeholder="e.g. We miss half our inbound leads after hours and follow-up is inconsistent."></textarea>
  </div>
  <div class="row2">
    <div class="field">
      <label for="budget_bracket">Monthly budget <span class="req">*</span></label>
      <select id="budget_bracket" name="budget_bracket" required>
        ${optionsHtml<BudgetBracket>(BUDGET_LABELS, "Select a range")}
      </select>
    </div>
    <div class="field">
      <label for="timeline_bracket">Timeline <span class="req">*</span></label>
      <select id="timeline_bracket" name="timeline_bracket" required>
        ${optionsHtml<TimelineBracket>(TIMELINE_LABELS, "Select a timeline")}
      </select>
    </div>
  </div>
  <div class="field">
    <label for="heard_about">How did you hear about us? (optional)</label>
    <input type="text" id="heard_about" name="heard_about" maxlength="120" />
  </div>

  <label class="consent">
    <input type="checkbox" id="consent" name="consent" required />
    <span>I agree that Royce Labs may contact me about my enquiry using the details above. <span class="req">*</span></span>
  </label>

  <button type="submit" id="submitBtn">Get my free assessment</button>
  <div class="msg" id="msg"></div>
</form>

<script>
(function () {
  var form = document.getElementById("leadForm");
  var btn = document.getElementById("submitBtn");
  var msg = document.getElementById("msg");

  // Records when the form was actually rendered, so the server can reject
  // submissions that arrive suspiciously fast (bots that POST immediately
  // without a human reading/filling the form).
  document.getElementById("form_rendered_at").value = String(Date.now());

  function showMsg(text, kind) {
    msg.textContent = text;
    msg.className = "msg " + kind;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var socialErr = document.getElementById("socialErr");
    var hasSocial = form.instagram_handle.value.trim() || form.linkedin_url.value.trim();
    if (!hasSocial) {
      socialErr.style.display = "block";
      form.instagram_handle.focus();
      socialErr.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    socialErr.style.display = "none";

    btn.disabled = true;
    btn.textContent = "Researching your business... (~30s)";
    msg.className = "msg";

    var payload = {
      company_name: form.company_name.value.trim(),
      company_website: form.company_website.value.trim(),
      industry: form.industry.value.trim(),
      instagram_handle: form.instagram_handle.value.trim(),
      linkedin_url: form.linkedin_url.value.trim(),
      name: form.name.value.trim(),
      role: form.role.value,
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      need_description: form.need_description.value.trim(),
      budget_bracket: form.budget_bracket.value,
      timeline_bracket: form.timeline_bracket.value,
      heard_about: form.heard_about.value.trim(),
      consent: form.consent.checked,
      website: form.website.value,
      form_rendered_at: form.form_rendered_at.value,
    };

    try {
      var res = await fetch("/form/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (res.ok && data.ok) {
        showMsg("Thanks! We're researching your business now — expect to hear from us soon.", "success");
        form.reset();
        form.style.display = "none";
      } else {
        showMsg(data.error || "Something went wrong. Please try again.", "error");
        btn.disabled = false;
        btn.textContent = "Get my free assessment";
      }
    } catch (err) {
      showMsg("Couldn't reach the server. Please try again.", "error");
      btn.disabled = false;
      btn.textContent = "Get my free assessment";
    }
  });
})();
</script>
</body>
</html>`;
}

export interface FormSubmission {
  company_name: string;
  company_website: string;
  industry: string;
  instagram_handle: string;
  linkedin_url: string;
  youtube_channel: string; // always "" for now - not collected by the form (see note in research.ts / README "future scope")
  name: string;
  role: string;
  email: string;
  phone: string;
  need_description: string;
  budget_bracket: string;
  timeline_bracket: string;
  heard_about: string;
  consent: boolean;
}

const VALID_ROLES = new Set(Object.keys(ROLE_LABELS));
const VALID_BUDGETS = new Set(Object.keys(BUDGET_LABELS));
const VALID_TIMELINES = new Set(Object.keys(TIMELINE_LABELS));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimum time (ms) between the form rendering and the submission arriving.
// Bots that fetch the page and immediately POST typically take well under
// this; a real person reading and filling 6+ fields never does.
const MIN_FILL_TIME_MS = 3000;

export function validateFormSubmission(
  body: unknown
): { ok: true; data: FormSubmission } | { ok: false; error: string; isSpam?: boolean } {
  const b = (body || {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  // Honeypot: real visitors never see or fill this field. Reject silently
  // with a generic-looking success-shaped error so bots don't learn to
  // detect and route around the honeypot specifically.
  if (str(b.website)) {
    return { ok: false, error: "Submission rejected.", isSpam: true };
  }

  const renderedAt = Number(b.form_rendered_at);
  if (renderedAt && Date.now() - renderedAt < MIN_FILL_TIME_MS) {
    return { ok: false, error: "Please take a moment to review before submitting.", isSpam: true };
  }

  const company_name = str(b.company_name);
  const name = str(b.name);
  const email = str(b.email);
  const role = str(b.role);
  const need_description = str(b.need_description);
  const budget_bracket = str(b.budget_bracket);
  const timeline_bracket = str(b.timeline_bracket);
  const consent = b.consent === true;
  const company_website = str(b.company_website);
  const instagram_handle = str(b.instagram_handle);
  const linkedin_url = str(b.linkedin_url);

  if (!company_name) return { ok: false, error: "Company name is required." };
  if (!company_website) return { ok: false, error: "Website is required." };
  if (!name) return { ok: false, error: "Your name is required." };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "A valid email is required." };
  if (!role || !VALID_ROLES.has(role)) return { ok: false, error: "Please select your role." };
  if (!need_description) return { ok: false, error: "Please describe what you're looking to solve." };
  if (!budget_bracket || !VALID_BUDGETS.has(budget_bracket))
    return { ok: false, error: "Please select a budget range." };
  if (!timeline_bracket || !VALID_TIMELINES.has(timeline_bracket))
    return { ok: false, error: "Please select a timeline." };
  if (!instagram_handle && !linkedin_url)
    return { ok: false, error: "Please provide at least one of Instagram or LinkedIn." };
  if (!consent) return { ok: false, error: "Please agree to be contacted before submitting." };

  return {
    ok: true,
    data: {
      company_name: company_name.slice(0, 200),
      company_website: company_website.slice(0, 200),
      industry: str(b.industry).slice(0, 120),
      instagram_handle: instagram_handle.replace(/^@/, "").slice(0, 120),
      linkedin_url: linkedin_url.slice(0, 200),
      youtube_channel: "", // not collected by the form - see FormSubmission comment above
      name: name.slice(0, 120),
      role,
      email: email.slice(0, 320),
      phone: str(b.phone).slice(0, 40),
      need_description: need_description.slice(0, 1000),
      budget_bracket,
      timeline_bracket,
      heard_about: str(b.heard_about).slice(0, 120),
      consent,
    },
  };
}
