// Royce Labs — AI chat backend (Cloudflare Pages Function)
// Route: POST /api/chat
// Uses Workers AI (env.AI) for grounded FAQ answers.
// When a lead is captured (name + email + query), emails it via Resend.

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const SYSTEM_PROMPT = `You are "Royce", the friendly assistant for Royce Labs — a done-for-you AI automation studio for small businesses.

ABOUT ROYCE LABS:
- We build AI-powered systems that eliminate repetitive work, improve operational efficiency, reduce costs, and free teams to focus on growth. We don't just add AI — we redesign the work around it.
- We sell outcomes, not chatbots. Every system is built end-to-end and grounded in the client's business.

SERVICES:
1. Lead qualification & instant response — replies to every inquiry in under 60 seconds, qualifies it, books good leads onto the calendar automatically.
2. Automated client-ready reporting — live branded dashboards with a plain-English narrative, auto-delivered.
3. 24/7 ad performance guard — trend-based alerts on CPA spikes, ad fatigue, and budget leaks, with the action to take.
4. Client onboarding automation — branded portal, auto-chased intake, and playbooks for the first 90 days.
5. Renewal & retention automation — value-recap emails, auto-drafted renewal proposals, escalation alerts.
6. Satisfaction & churn signals — one-question pulse surveys routed automatically; detractors flagged, promoters asked for reviews.

HOW WE PRICE:
- Priced on outcomes, never hourly. Every engagement is scoped to the client's specific bottleneck and quoted clearly up front. Typically a fixed setup, then a flat monthly retainer. No fixed public price — it varies per business.

HOW IT WORKS: Discovery call -> fixed-scope setup sprint (live in days) -> weekly proof number -> scale one automation per quarter.

RULES:
- ONLY answer questions about Royce Labs, its services, process, pricing approach, and how AI automation could help the visitor's business. Politely decline anything unrelated (coding help, general knowledge, other companies) and steer back to how Royce Labs can help.
- Keep replies short, warm, and concrete (2-4 sentences). No markdown headers, no long lists unless asked.
- Your PRIMARY GOAL is to help the visitor and encourage them to either (a) book a free discovery call, or (b) leave their name, email, and what they need so the team can reach out.
- When a visitor shows interest or asks to be contacted, ask for their name, email, and a one-line description of what they need — one friendly ask, not an interrogation.
- Never invent specific prices, guarantees of lead quantity, statistics you weren't given, or features not listed above.
- If unsure, say so and offer to connect them with the team.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isValidEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function sendLeadEmail(env, lead) {
  const apiKey = (env.RESEND_API_KEY || "").trim();
  if (!apiKey) return { sent: false, reason: "no_api_key" };
  const to = (env.LEAD_TO_EMAIL || "EMAIL@example.com").trim();
  const from = (env.LEAD_FROM_EMAIL || "Royce Labs <onboarding@resend.dev>").trim();

  const text =
    `New chat lead from roycelabs.pages.dev\n\n` +
    `Name:  ${lead.name || "-"}\n` +
    `Email: ${lead.email || "-"}\n` +
    `Need:  ${lead.query || "-"}\n\n` +
    `Recent conversation:\n${lead.transcript || "-"}\n`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: isValidEmail(lead.email) ? lead.email : undefined,
      subject: `New chat lead: ${lead.name || lead.email || "website visitor"}`,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { sent: false, reason: `resend_${res.status}`, detail };
  }
  return { sent: true };
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }
  return handleChat(context);
}

async function handleChat({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lead = body.lead && typeof body.lead === "object" ? body.lead : null;

  // 1) If the client submitted a completed lead, email it.
  if (lead && (lead.email || lead.name)) {
    if (!isValidEmail(lead.email)) {
      return json({ ok: false, error: "A valid email is required." }, 400);
    }
    const result = await sendLeadEmail(env, {
      name: (lead.name || "").slice(0, 200),
      email: (lead.email || "").slice(0, 320),
      query: (lead.query || "").slice(0, 2000),
      transcript: (lead.transcript || "").slice(0, 5000),
    });
    return json({
      ok: result.sent,
      leadSaved: result.sent,
      note: result.sent
        ? "Lead delivered."
        : "Chat works, but lead email is not configured yet.",
    });
  }

  // 2) Normal chat turn — call Workers AI.
  if (!env.AI) {
    return json({ error: "AI binding not configured." }, 500);
  }

  // Trim history to last ~10 turns to keep prompt small.
  const trimmed = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  const aiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed];

  try {
    const out = await env.AI.run(MODEL, {
      messages: aiMessages,
      max_tokens: 400,
      temperature: 0.4,
    });
    const reply =
      (out && (out.response || out.result || out.text)) ||
      "Sorry, I didn't catch that — could you rephrase?";
    return json({ reply: String(reply).trim() });
  } catch (err) {
    return json({ error: "AI request failed", detail: String(err) }, 502);
  }
}
