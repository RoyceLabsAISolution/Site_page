import type { Env, Channel } from "./types";
import { runQualifyingCore } from "./lib/qualifyingPipeline";
import { runScoringPipeline } from "./lib/scoringPipeline";
import { searchLeadById, createFormLead, isDuplicateMessage, checkRateLimit, listLeads } from "./lib/db";
import { extractWhatsAppMessage, sendWhatsAppMessage } from "./lib/whatsapp";
import { verifyMetaChallenge, extractInstagramMessage, sendInstagramMessage } from "./lib/instagram";
import { runHybridChat } from "./lib/hybridChatPipeline";
import type { ChatMessage } from "./lib/faq";
import { renderFormPage, validateFormSubmission } from "./lib/formPage";
import { renderLeadReportPage } from "./lib/leadReportPage";
import { runHealthCheck, postHealthAlert } from "./lib/healthCheck";
import { isAuthorized, requireAuthResponse } from "./lib/adminAuth";
import { renderLeadsListPage, renderLeadsCsv } from "./lib/leadsListPage";

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.CORS_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      // ---------------------------------------------------------------
      // POST /webhook/chat  { sessionId, chatInput }
      // Port of Web-Trigger.json (LangChain Chat Trigger -> Normalize ->
      // Qualifying-Core -> Format Chat Response).
      // ---------------------------------------------------------------
      if (url.pathname === "/webhook/chat" && request.method === "POST") {
        const body = (await request.json()) as { sessionId?: string; chatInput?: string };
        if (!body.sessionId) {
          return json({ error: "sessionId is required" }, env, 400);
        }

        const result = await runQualifyingCore(
          env,
          {
            channel: "website" as Channel,
            external_id: body.sessionId,
            message_text: body.chatInput || "",
          },
          (leadId) => ctx.waitUntil(runScoringPipeline(env, leadId).catch((e) => console.error(e)))
        );

        return json({ output: result.text }, env);
      }

      // ---------------------------------------------------------------
      // POST /api/chat  { sessionId, messages: [{role, content}, ...] }
      // Hybrid FAQ <-> structured-qualification endpoint for the
      // roycelabs.pages.dev widget (replaces its original /api/chat Pages
      // Function - source unavailable, no connected Git repo). Starts every
      // session in free-form FAQ mode grounded on site content; hands off
      // to the same Qualifying-Core flow as /webhook/chat once the visitor
      // shares contact info or expresses clear buying intent.
      // ---------------------------------------------------------------
      if (url.pathname === "/api/chat" && request.method === "POST") {
        const body = (await request.json()) as {
          sessionId?: string;
          messages?: ChatMessage[];
        };
        if (!body.sessionId) {
          return json({ error: "sessionId is required" }, env, 400);
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return json({ error: "messages is required" }, env, 400);
        }

        const result = await runHybridChat(env, body.sessionId, body.messages, (leadId) =>
          ctx.waitUntil(runScoringPipeline(env, leadId).catch((e) => console.error(e)))
        );

        return json({ reply: result.reply, mode: result.mode }, env);
      }

      // ---------------------------------------------------------------
      // GET /form  - Worker-hosted structured intake form. Portable/
      // embeddable (iframe or direct link) rather than baked into a
      // specific static site, so any future tenant can reuse it.
      // ---------------------------------------------------------------
      if (url.pathname === "/form" && request.method === "GET") {
        return new Response(renderFormPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders(env) },
        });
      }

      // ---------------------------------------------------------------
      // POST /form/submit  - structured lead intake. Direct-entry lead
      // (skips the slot state machine entirely - every field arrives typed
      // and validated in one shot), then runs the same scoring/research/
      // Slack pipeline as every other channel.
      //
      // Spam protection: per-IP rate limit (shares the same sliding-window
      // mechanism as the chat rate limiter), honeypot field + minimum
      // fill-time check (see validateFormSubmission in formPage.ts).
      // ---------------------------------------------------------------
      if (url.pathname === "/form/submit" && request.method === "POST") {
        const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
        const formRateLimitPerMin = 5; // a real person submits this form once, not repeatedly
        const rl = await checkRateLimit(env, "default", `form:${clientIp}`, formRateLimitPerMin);
        if (!rl.allowed) {
          return json({ ok: false, error: "Too many submissions. Please try again in a minute." }, env, 429);
        }

        const body = await request.json();
        const validated = validateFormSubmission(body);
        if (!validated.ok) {
          if (validated.isSpam) {
            // Don't reveal to the caller (bot) that this was specifically
            // detected as spam vs. a validation error - same shape either way.
            console.warn(`/form/submit: rejected likely spam from ${clientIp}: ${validated.error}`);
          }
          return json({ ok: false, error: validated.error }, env, 400);
        }
        const d = validated.data;

        const leadId = await createFormLead(env, {
          tenant_id: "default",
          source: "Form",
          company_name: d.company_name,
          company_website: d.company_website,
          industry: d.industry,
          name: d.name,
          email: d.email,
          phone: d.phone,
          role: d.role,
          instagram_handle: d.instagram_handle,
          linkedin_url: d.linkedin_url,
          youtube_channel: d.youtube_channel,
          need_description: d.need_description,
          budget_bracket: d.budget_bracket,
          timeline_bracket: d.timeline_bracket,
          heard_about: d.heard_about,
          consent_given: d.consent,
        });

        // Await the full pipeline (matches the source n8n workflow's
        // waitForSubWorkflow=true for form submissions) rather than
        // fire-and-forget. Chat gets instant replies via waitUntil() because
        // a chat reply must return immediately - but form submissions
        // already show a "Submitting..." state, and the combined chain here
        // (parallel website/LinkedIn/Instagram fetches + 2 LLM calls) can
        // exceed Workers' ~30s waitUntil() grace period, which was silently
        // truncating research before this change (confirmed via wrangler
        // tail: "waitUntil() tasks did not complete... and have been
        // cancelled"). Awaiting properly here has no such limit as long as
        // the client stays connected.
        try {
          await runScoringPipeline(env, leadId);
        } catch (e) {
          console.error(`Scoring pipeline failed for lead ${leadId} (lead was still created):`, e);
        }

        return json({ ok: true, lead_id: leadId }, env);
      }

      // ---------------------------------------------------------------
      // GET /leads  - admin dashboard: table of all leads, links to each
      // full report. GET /leads.csv - same data as a CSV download.
      // Both password-protected (HTTP Basic Auth, see adminAuth.ts).
      // ---------------------------------------------------------------
      if (url.pathname === "/leads" && request.method === "GET") {
        if (!isAuthorized(request, env)) return requireAuthResponse();
        const leads = await listLeads(env);
        return new Response(renderLeadsListPage(leads), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/leads.csv" && request.method === "GET") {
        if (!isAuthorized(request, env)) return requireAuthResponse();
        const leads = await listLeads(env);
        return new Response(renderLeadsCsv(leads), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=leads.csv",
          },
        });
      }

      // ---------------------------------------------------------------
      // GET /leads/:id  - persistent lead/research report page, linked
      // from the Slack alert's "Open full lead report" button.
      // Password-protected - browsers will prompt for the shared admin
      // password the first time (then remember it for the session).
      // ---------------------------------------------------------------
      const leadReportMatch = url.pathname.match(/^\/leads\/(\d+)$/);
      if (leadReportMatch && request.method === "GET") {
        if (!isAuthorized(request, env)) return requireAuthResponse();
        const leadId = parseInt(leadReportMatch[1], 10);
        const rec = await searchLeadById(env, leadId);
        return new Response(renderLeadReportPage(rec), {
          status: rec ? 200 : 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // ---------------------------------------------------------------
      // WhatsApp Business Cloud API webhook.
      // Port of WA-Trigger.json (dedup guard -> Qualifying-Core -> send).
      // Requires WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID secrets
      // and a WhatsApp Business Cloud API account (developers.facebook.com)
      // before it can actually send - webhook receipt + qualifying logic
      // work regardless.
      //
      // GET is Meta's webhook verification handshake (same token/challenge
      // scheme as the Instagram webhook below).
      // ---------------------------------------------------------------
      if (url.pathname === "/webhook/whatsapp" && request.method === "GET") {
        const result = verifyMetaChallenge(env, url.searchParams);
        if (result.ok) {
          return new Response(result.challenge, { status: 200 });
        }
        return json({ error: "verification failed" }, env, 403);
      }

      if (url.pathname === "/webhook/whatsapp" && request.method === "POST") {
        const body = await request.json();
        const msg = extractWhatsAppMessage(body);
        if (!msg) {
          // No message in payload (e.g. a status-update webhook) - ack anyway.
          return json({ ok: true }, env);
        }

        const isDup = await isDuplicateMessage(env, "whatsapp", msg.message_id);
        if (isDup) {
          return json({ ok: true, duplicate: true }, env);
        }

        const result = await runQualifyingCore(
          env,
          {
            channel: "whatsapp" as Channel,
            external_id: msg.external_id,
            message_text: msg.message_text,
          },
          (leadId) => ctx.waitUntil(runScoringPipeline(env, leadId).catch((e) => console.error(e)))
        );

        await sendWhatsAppMessage(env, msg.external_id, result.text);
        return json({ ok: true }, env);
      }

      // ---------------------------------------------------------------
      // Instagram Messaging webhook (Meta Graph API).
      // Port of IG-Trigger.json (verify challenge -> dedup guard ->
      // Qualifying-Core -> send). Requires META_VERIFY_TOKEN (for the GET
      // handshake) and META_PAGE_ACCESS_TOKEN (to send) secrets before it
      // can actually reply - webhook receipt + qualifying logic work
      // regardless (receiving was already proven live in the source system).
      // ---------------------------------------------------------------
      if (url.pathname === "/webhook/instagram" && request.method === "GET") {
        const result = verifyMetaChallenge(env, url.searchParams);
        if (result.ok) {
          return new Response(result.challenge, { status: 200 });
        }
        return json({ error: "verification failed" }, env, 403);
      }

      if (url.pathname === "/webhook/instagram" && request.method === "POST") {
        const body = await request.json();
        const msg = extractInstagramMessage(body);
        if (!msg) {
          // Ack immediately regardless (Respond Ack (200) in the source
          // workflow) so Meta doesn't retry while nothing is processed.
          return new Response("EVENT_RECEIVED", { status: 200 });
        }

        const isDup = await isDuplicateMessage(env, "instagram", msg.message_id);
        if (isDup) {
          return new Response("EVENT_RECEIVED", { status: 200 });
        }

        const result = await runQualifyingCore(
          env,
          {
            channel: "instagram" as Channel,
            external_id: msg.external_id,
            message_text: msg.message_text,
          },
          (leadId) => ctx.waitUntil(runScoringPipeline(env, leadId).catch((e) => console.error(e)))
        );

        ctx.waitUntil(sendInstagramMessage(env, msg.external_id, result.text));
        return new Response("EVENT_RECEIVED", { status: 200 });
      }

      // ---------------------------------------------------------------
      // POST /internal/score  { lead_id }
      // Manual/direct trigger for AI-Scoring-And-Notify.json - handy for
      // testing or for other callers (Ads-Trigger equivalent, cron, etc.)
      // ---------------------------------------------------------------
      if (url.pathname === "/internal/score" && request.method === "POST") {
        const body = (await request.json()) as { lead_id?: number };
        if (!body.lead_id) return json({ error: "lead_id is required" }, env, 400);
        ctx.waitUntil(runScoringPipeline(env, body.lead_id).catch((e) => console.error(e)));
        return json({ ok: true, queued: true }, env);
      }

      if (url.pathname === "/health") {
        const result = await runHealthCheck(env);
        return json(result, env, result.ok ? 200 : 503);
      }

      return json({ error: "Not found" }, env, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal error", detail: String(err) }, env, 500);
    }
  },

  // Runs on the schedule defined in wrangler.toml [triggers].crons. Checks
  // D1 connectivity and NVIDIA NIM model availability (through the real
  // fallback path), and posts to a dedicated Slack channel if either fails -
  // turning "the pipeline silently stopped scoring" into "someone gets
  // paged," which is the actual failure mode that bit this project twice
  // already (corrupted secret, deprecated model - both silent otherwise).
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const result = await runHealthCheck(env);
    console.log("Scheduled health check:", JSON.stringify(result));
    if (!result.ok) {
      ctx.waitUntil(postHealthAlert(env, result));
    }
  },
};
