// Royce Labs: pilot application endpoint (Cloudflare Pages Function)
// Route: POST /api/apply
// Validates the short form and emails it to the team through Resend.
// Needs these Pages secrets (already set on the project): RESEND_API_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL.
// No storage is bound, so the email is the only copy. If sending fails we return an error
// and the page shows the visitor a prefilled email/call fallback instead of losing the lead.

const CITIES = ["Coimbatore", "Chennai", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Other Tamil Nadu city", "Outside Tamil Nadu"];
const VOLUMES = ["", "Under 20", "20 to 50", "50 to 100", "More than 100"];
const FALLBACK_TO = "officialroycelabs.ai@gmail.com";

const clean = (v, max) =>
  String(v == null ? "" : v)
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

function normalizePhone(raw) {
  let d = String(raw || "").replace(/[^\d]/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return "+91 " + d.slice(0, 5) + " " + d.slice(5);
}

const wantsJson = (request) => (request.headers.get("accept") || "").includes("application/json");

function reply(request, status, payload, redirectStatus) {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  // No-JavaScript fallback: send the visitor back to the form page with a status.
  return new Response(null, {
    status: 303,
    headers: { location: redirectStatus === "ok" ? "/apply/thanks/" : "/apply/?status=" + redirectStatus, "cache-control": "no-store" },
  });
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return reply(request, 400, { ok: false, error: "bad_request" }, "error");

  // Bots fill the hidden field; pretend success so they do not retry.
  if (clean(form.get("website"), 100)) return reply(request, 200, { ok: true }, "ok");

  const name = clean(form.get("name"), 120);
  const business = clean(form.get("business"), 160);
  const email = clean(form.get("email"), 120).toLowerCase();
  const phoneRaw = clean(form.get("phone"), 20);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
  const city = clean(form.get("city"), 60);
  const volume = clean(form.get("volume"), 30);
  const note = clean(form.get("note"), 600);
  const consent = form.get("consent") === "yes";
  const source = clean(form.get("source"), 120);
  const lang = clean(form.get("lang"), 10);

  const errors = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (business.length < 2) errors.business = "Please enter your business or company name.";
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(email)) errors.email = "Please enter a valid email address.";
  if (phoneRaw && !phone) errors.phone = "Please enter a 10-digit mobile number, or leave it empty.";
  if (!CITIES.includes(city)) errors.city = "Please choose a city.";
  if (!VOLUMES.includes(volume)) errors.volume = "Please choose from the list.";
  if (!consent) errors.consent = "Please tick the box so we can contact you.";
  if (Object.keys(errors).length) {
    return reply(request, 422, { ok: false, error: "validation", errors }, "invalid");
  }

  const apiKey = (env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    console.error("apply: RESEND_API_KEY missing");
    return reply(request, 502, { ok: false, error: "not_configured" }, "error");
  }
  const to = (env.LEAD_TO_EMAIL || FALLBACK_TO).trim();
  const from = (env.LEAD_FROM_EMAIL || "Royce Labs <onboarding@resend.dev>").trim();

  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const text =
    `New pilot application\n\n` +
    `Name:      ${name}\n` +
    `Business:  ${business}\n` +
    `Email:     ${email}\n` +
    `Phone:     ${phone ? phone + "  (WhatsApp: https://wa.me/" + phone.replace(/\D/g, "") + ")" : "-"}\n` +
    `City:      ${city}\n` +
    `Enquiries/week: ${volume || "-"}\n` +
    `Note:      ${note || "-"}\n\n` +
    `Consent to be contacted: yes (ticked on the form, ${when} IST)\n` +
    `Page: ${source || "-"}   Language: ${lang || "-"}\n` +
    `Country: ${request.headers.get("cf-ipcountry") || "-"}\n`;

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `Pilot application: ${name}, ${city}`, text }),
    });
  } catch (err) {
    console.error("apply: resend fetch failed", String(err));
    return reply(request, 502, { ok: false, error: "send_failed" }, "error");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("apply: resend", res.status, detail.slice(0, 300));
    return reply(request, 502, { ok: false, error: "send_failed" }, "error");
  }
  return reply(request, 200, { ok: true }, "ok");
}

export async function onRequest({ request }) {
  return new Response(JSON.stringify({ error: "Use POST" }), {
    status: 405,
    headers: { "content-type": "application/json", allow: "POST" },
  });
}
