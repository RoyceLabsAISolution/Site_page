# Lead Qualification — Cloudflare Workers port

**Live at:** `https://leadqual-worker.officialroycelabs-ai.workers.dev`

Reimplements the active production path of the n8n workflow system
(`../ARCHITECTURE.md`, `../README.md`) as a single Cloudflare Worker + D1
database. No n8n, no VPS, no container — runs entirely on Cloudflare's free
tier.

## Entry points (all feed the same scoring/research/Slack pipeline)

| Entry point | Best for | Route |
|---|---|---|
| **Structured form** (primary/recommended) | Highest-quality BANT data — budget/timeline/role collected as dropdowns, not guessed from text. Portable/embeddable (iframe or direct link), not tied to any one site. | `GET /form`, `POST /form/submit` |
| Chat widget (hybrid FAQ) | Casual visitors who want quick answers before committing; hands off to structured qualification mid-conversation once they show intent. | `POST /api/chat` |
| Chat-only (legacy) | Same 6-slot chat flow without the FAQ layer, used directly by a dedicated chat widget. | `POST /webhook/chat` |
| WhatsApp / Instagram | Channel-specific inbound. | see below |

Every path ends up calling `runScoringPipeline()`, so scoring, research, and
Slack alerts behave identically regardless of entry point.

## Reliability (built)

Two real incidents happened during development — a PowerShell-BOM-corrupted
secret and an NVIDIA model deprecation — and both failed **silently** (no
crash, no error, the pipeline just quietly stopped short of Slack). That
pattern is the single biggest risk for a lead-qual product: a broken
pipeline looks identical to "no leads today." These exist specifically to
make that kind of silence impossible going forward:

- **Model fallback** (`src/lib/nim.ts`) — `NVIDIA_NIM_MODEL` is tried first;
  on HTTP 404/410 (model gone/renamed) it automatically falls through to
  `NVIDIA_NIM_FALLBACK_MODELS` (comma-separated) without any code change or
  human intervention. Verified by deliberately pointing the primary model at
  the actual dead model from the earlier incident and confirming a real form
  submission still scored correctly via the fallback.
- **Scheduled health check** (`src/lib/healthCheck.ts`, cron `*/15 * * * *`
  in `wrangler.toml`) — checks D1 connectivity and a real NIM completion
  (through the same fallback path real scoring uses) every 15 minutes.
  Posts a `🚨 SYSTEM HEALTH ALERT` to Slack (same channel as lead alerts,
  clearly prefixed — set `SYSTEM_HEALTH_SLACK_WEBHOOK_URL` for a separate
  channel instead) if either check fails. `GET /health` runs the same check
  on-demand and returns HTTP 503 on failure instead of always `200 OK`.
- **Form spam protection** (`src/lib/formPage.ts`) — honeypot field
  (invisible to real visitors), minimum-fill-time check (rejects submissions
  that arrive less than 3s after the form rendered), and a 5/minute per-IP
  rate limit on `POST /form/submit`.

## Reliability (planned, not yet built)

Documented here so these aren't forgotten, not because they're urgent today:

- **Data retention / deletion.** No policy yet for how long "cold" leads
  stay in D1, and no self-serve way for someone to request their data be
  deleted (relevant given the FAQ content already promises "we act as
  processor, you own your list and consent"). Minimal version: a
  `DELETE /internal/leads/:id` admin endpoint (behind some auth) plus a
  scheduled cleanup of cold leads older than N days.
- **Observability dashboard.** The `events` table already logs `scored`/
  `qualified_complete`/etc. but nothing reads it back. A `GET /internal/stats`
  endpoint (leads per day, tier breakdown, avg time-to-score, entry-point
  breakdown) would turn the existing D1 data into a lightweight dashboard
  without needing a BI tool.
- **Multi-tenancy.** See the dedicated section below — schema is ready,
  onboarding flow isn't.
- **Custom domain.** Currently on `*.workers.dev` / `*.pages.dev`. Fine for
  now; would look more professional on e.g. `get.roycelabs.ai` if this
  becomes more customer-facing.
- **WhatsApp/Instagram sending.** Already implemented, just needs real Meta
  credentials (`WHATSAPP_ACCESS_TOKEN`, `META_PAGE_ACCESS_TOKEN`) — see the
  dedicated setup section below. Not worth doing until there's an actual
  need for those channels.

## Lead report page

Every scored lead gets a persistent report at `GET /leads/:id` — BANT
breakdown with score bars, structured form answers, business research
findings, and recommended services/talking points. The Slack alert links
directly to it via an "Open full lead report" button, so sales always has a
durable view instead of only a Slack message that scrolls away.

## Admin dashboard

`GET /leads` — a table of every lead (company, contact, score, tier,
status, created date), each row linking to its full report page.
`GET /leads.csv` — same data as a CSV download.

Both routes (and `/leads/:id`) are protected with HTTP Basic Auth — a
browser will prompt for a username (anything) and password (the shared
secret below) the first time, then remember it for the session:

```powershell
npx wrangler secret put ADMIN_PASSWORD
```

Without `ADMIN_PASSWORD` set, these routes **fail closed** (deny access)
rather than being left open, so there's no accidental "forgot to set the
password" exposure of lead PII.

This intentionally stays a simple shared-password dashboard rather than
per-user accounts/roles — appropriate for a small team, not meant to scale
past that without revisiting.

## What's ported (and what isn't)

| Original n8n workflow      | Ported as                                   |
|-----------------------------|----------------------------------------------|
| *(new — no n8n equivalent)* | **Structured intake form** — `src/lib/formPage.ts` (`GET /form`, `POST /form/submit`). Direct-entry lead, skips the slot state machine; budget/timeline/role arrive as validated enums, floored directly into BANT sub-scores (`structuredScoreFloor()` in `scoring.ts`) instead of being guessed from free text. |
| *(new — no n8n equivalent)* | **Lead report page** — `src/lib/leadReportPage.ts` (`GET /leads/:id`). |
| `Web-Trigger`               | `POST /webhook/chat`                          |
| `Qualifying-Core`           | `src/lib/qualifyingCore.ts` + `qualifyingPipeline.ts` |
| `Form-Ingestion`            | **Removed** — replaced by the structured intake form above. Tally's webhook, `formLinkTemplate`, and the old Direct-Form-lead path were removed once the form became the primary entry point (see git history / n8n source `Form-Ingestion.json` if you ever need the original chat-completion-link-to-Tally behavior back). |
| `AI-Scoring-And-Notify`     | `src/lib/scoring.ts` + `scoringPipeline.ts`   |
| `Business-Research-Agent`   | `src/lib/research.ts` — fetches REAL data from website + LinkedIn (Jina) and Instagram (Apify) in parallel, a meaningful improvement over the source workflow which only had Jina enabled and left Serper/Apify/YouTube/Proxycurl disabled. YouTube support is built (`src/lib/youtube.ts`, verified working) but not currently wired in - future scope. See "Social research setup" below. |
| `WA-Trigger`                | `src/lib/whatsapp.ts` + `GET/POST /webhook/whatsapp` — fully implemented, just needs `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` secrets to actually send (same "needs WA cred" gap as the source system) |
| `IG-Trigger`                | `src/lib/instagram.ts` + `GET/POST /webhook/instagram` — fully implemented, just needs `META_PAGE_ACCESS_TOKEN` secret to send (receiving already works with just `META_VERIFY_TOKEN`, matching the source system's "recv ok; send needs token" status) |
| `Ads-Trigger`               | **Not ported** — needs Facebook Lead Ads + Google Sheets OAuth, neither configured in the source system. Add if/when you set those up; `runScoringPipeline` and `POST /internal/score` are already reusable for it. |
| Booking-link send (WhatsApp/email) | **Not ported** — disabled in the source workflow too (no SMTP/WhatsApp credential). |

Postgres → **D1 (SQLite)**: the source system already used a plain Postgres
schema (`../sql/01_schema.sql`), not literal Airtable — this made porting
straightforward. `sql/schema.sql` here is a direct SQLite translation, plus
one new table (`processed_messages`) replacing n8n's in-memory
`$getWorkflowStaticData('global')` dedup cache — Workers has no persistent
memory across requests, so WhatsApp/Instagram redelivery dedup needed a
durable equivalent. `sql/migrations/002_form_fields.sql` adds the structured
form columns (`role`, `industry`, `budget_bracket`, `timeline_bracket`,
`heard_about`, `need_description`) — already included in fresh `schema.sql`
installs, only needed for databases created before this migration existed.

## Project layout

```
worker/
  src/
    index.ts                  # HTTP routes / fetch handler
    types.ts                  # Env bindings, shared types, SLOTS config
    lib/
      qualifyingCore.ts        # slot state machine (pure logic, unit-testable)
      qualifyingPipeline.ts     # orchestrates DB + state machine + async scoring trigger
      scoring.ts                # BANT prompt + agent input prep
      scoringPipeline.ts        # orchestrates search -> score -> research -> slack
      research.ts               # business research (Jina + LLM)
      formPage.ts                # structured intake form HTML + validation
      leadReportPage.ts           # persistent /leads/:id report page
      whatsapp.ts                # WhatsApp Cloud API webhook parsing + send
      instagram.ts               # Instagram Messaging webhook verify/parse + send
      slack.ts                   # Slack Block Kit builder + webhook post
      nim.ts                      # NVIDIA NIM (OpenAI-compatible) structured-output client
      db.ts                        # all D1 queries
  sql/schema.sql               # D1 schema (SQLite translation of ../sql/01_schema.sql)
  wrangler.toml
```

## One-time setup

```powershell
cd worker
npm install

# Create the D1 database and copy the printed database_id into wrangler.toml
npx wrangler d1 create leadqual

# Apply schema locally (for `wrangler dev`) and to production
npm run db:init
npm run db:init:remote

# Secrets (never go in wrangler.toml)
npx wrangler secret put NVIDIA_NIM_API_KEY
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler secret put JINA_API_KEY          # strongly recommended - see note below
npx wrangler secret put ADMIN_PASSWORD        # protects /leads dashboard - required, fails closed without it

# Only needed once you have the respective accounts (see "WhatsApp / Instagram
# setup" below) - the worker runs fine without these, it just won't send.
npx wrangler secret put META_VERIFY_TOKEN
npx wrangler secret put WHATSAPP_ACCESS_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put META_PAGE_ACCESS_TOKEN
```

> **Get a free Jina API key** at https://jina.ai/reader (just sign up, no
> payment needed) and set it as `JINA_API_KEY`. Without it, business
> research's website-fetch step is rate-limited to 20 requests/minute
> **per IP** — and since Cloudflare Workers share IPs across many
> customers, that shared 20/min budget gets exhausted by traffic that has
> nothing to do with this app (confirmed: identical requests succeed from a
> home connection but return HTTP 429 from Cloudflare's network). A free
> key raises this to 500 RPM and switches tracking to per-key instead of
> per-IP, which actually fixes it rather than just retrying into the same
> wall. Research still degrades gracefully without a key (falls back to the
> LLM's general knowledge about the company), it's just less likely to get
> real, current website content.

Get an NVIDIA NIM API key free at https://build.nvidia.com (same provider the
original n8n workflow already used).

## Social research setup (Instagram / LinkedIn)

The intake form requires at least one of Instagram or LinkedIn (plus a
mandatory website) - but each channel only produces *real* research data if
its corresponding integration is configured. Without these, that channel's
report section shows "not found"/"not available" rather than a guess.

| Channel | How it's fetched | Cost | Setup |
|---|---|---|---|
| Website | Jina Reader | Free | `JINA_API_KEY` (see above) |
| LinkedIn | Jina Reader (same mechanism - LinkedIn's public pages don't block it, confirmed by testing; Instagram's do) | Free | Same `JINA_API_KEY` |
| Instagram | Apify Instagram Profile Scraper (`src/lib/instagramLookup.ts`) | ~$0.0026/lookup ($2.60 per 1,000), **$5 free credit** on signup ≈ 1,900 free lookups | `APIFY_API_TOKEN` - sign up at https://apify.com, get your token from Settings → Integrations |

**YouTube is future scope, not currently active.** `src/lib/youtube.ts` is
fully built and verified working against the real official YouTube Data API
v3 (free, 10,000 quota units/day, no OAuth/billing needed) - it's just not
wired into the form or `research.ts` right now (product decision: keep the
required-socials list to Instagram/LinkedIn only for the initial launch).
Re-enabling later is small: add the YouTube field back to `formPage.ts` and
uncomment the `youtubePromise` call in `research.ts`.

**Why Instagram needs a paid service and the others don't:** Instagram
actively blocks scraping (confirmed: Jina Reader returns HTTP 403 fetching a
public profile). Meta's *official* Instagram Graph API only returns data for
accounts that have already connected via OAuth to your app — unworkable for
researching prospects who haven't onboarded with you yet. A legitimate
public-data scraping service (Apify) is the only practical route; it's cheap
enough that $5 of free credit covers roughly 1,900 lookups before any real
cost.

```powershell
npx wrangler secret put APIFY_API_TOKEN
```

> **Windows PowerShell gotcha:** piping *any* secret into `wrangler secret
> put` via PowerShell's `|` operator can silently prepend a UTF-8 BOM to the
> value, corrupting it (this bit both `NVIDIA_NIM_API_KEY`, causing HTTP 401,
> and `SLACK_WEBHOOK_URL`, causing Slack alerts to silently never post — the
> webhook itself worked fine when tested directly, only the corrupted secret
> failed). Use `cmd.exe`'s native `<` redirection instead:
> `cmd /c "npx wrangler secret put SLACK_WEBHOOK_URL < webhook_url.txt"` — or
> just run `wrangler secret put` interactively and paste the value when
> prompted, which doesn't have this issue.
>
> **Model note:** the original workflow's model
> (`nvidia/llama-3.3-nemotron-super-49b-v1`) reached end-of-life on
> 2026-08-26 and now returns HTTP 410. This port uses
> `nvidia/nemotron-3.5-lightning-30b-a3b` instead (set in `wrangler.toml`),
> with `chat_template_kwargs: { thinking: false }` in `src/lib/nim.ts` to
> disable its reasoning mode — without that flag it puts a long
> chain-of-thought in the response `content` before/instead of the actual
> JSON, which breaks structured-output parsing. If NVIDIA deprecates this
> model too, check `GET /v1/models` on `NVIDIA_NIM_BASE_URL` for current
> options and update `NVIDIA_NIM_MODEL`.

## WhatsApp / Instagram setup

Both channels are fully implemented (webhook verification, message parsing,
dedup, qualifying logic, sending) — only the send side needs real Meta
credentials, exactly matching the source n8n system's status.

**WhatsApp** (`WA-Trigger` equivalent):
1. Create a Meta app at developers.facebook.com → add the "WhatsApp" product.
2. It gives you a free test number + temporary access token + phone number ID.
3. `wrangler secret put WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`.
4. In the Meta app's WhatsApp webhook config, set the callback URL to
   `https://api.yourdomain.com/webhook/whatsapp` and the verify token to
   whatever you set `META_VERIFY_TOKEN` to.

**Instagram** (`IG-Trigger` equivalent):
1. Same Meta app → add the "Instagram" product, linked to a Facebook Page
   with an Instagram professional account.
2. `wrangler secret put META_VERIFY_TOKEN` (shared with WhatsApp's handshake)
   and register `https://api.yourdomain.com/webhook/instagram` as the
   callback URL — Meta will immediately call it with `GET
   ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`, which this
   worker answers correctly out of the box.
3. Generate a Page Access Token with `instagram_manage_messages` scope →
   `wrangler secret put META_PAGE_ACCESS_TOKEN` to enable sending replies.

Without `WHATSAPP_ACCESS_TOKEN`/`META_PAGE_ACCESS_TOKEN` set, both routes
still receive messages, run the full qualifying/scoring pipeline, and log a
console warning instead of sending — nothing crashes, you just won't see a
reply on that channel until the token is set.

## Local development

```powershell
npm run dev
# POST http://127.0.0.1:8787/webhook/chat  { "sessionId": "abc", "chatInput": "hello" }
```

The chat flow, slot state machine, rate limiting, and structured form were
verified locally against a fresh D1 instance — same 6-question chat flow,
skip/decline handling, and full form submit -> score -> research -> Slack
pipeline. The WhatsApp/Instagram webhook handlers were also verified locally:
Meta's verification handshake (`GET .../webhook/instagram?hub.mode=subscribe&...`),
full message → lead → qualifying-core flow for both channels, and redelivery
dedup (posting the same `message_id` twice only creates one lead / runs the
pipeline once).

For local testing of the verification handshake and any code path reading
`META_VERIFY_TOKEN`, create a `.dev.vars` file (gitignored) in `worker/`:

```
META_VERIFY_TOKEN=your-local-test-token
```

## Deploy

```powershell
npm run deploy
```

**Already deployed** to `https://leadqual-worker.officialroycelabs-ai.workers.dev`
using the real NVIDIA NIM key and Slack webhook pulled from the running n8n
container's credential store (`n8n export:credentials --decrypted`, value
piped straight to `wrangler secret put`, decrypted export file deleted
immediately after — never committed or left on disk).

**Verified live** (not just locally): ran the full 7-message chat flow
against the production URL → lead created in production D1 → triggered
`/internal/score` → real NVIDIA NIM BANT scoring (`ai_score`, `ai_tier`,
`bant_*` columns populated) → business research ran (gracefully handled a
Jina fetch failure on the test domain and still produced a report) → status
reached `Researched`, meaning the Slack alert step fired.

To use your own domain (since you're already on Cloudflare), add a route in
the Cloudflare dashboard (Workers & Pages → your worker → Triggers → Custom
Domains), e.g. `api.yourdomain.com`, then point your site's chat widget /
form at:

- `https://api.yourdomain.com/webhook/chat` — chat widget (legacy, chat-only)
- `https://api.yourdomain.com/api/chat` — hybrid FAQ + qualification chat widget
- `https://api.yourdomain.com/form` — structured intake form (primary entry point)

## Wiring your Cloudflare-hosted site to it

Your frontend just needs to POST to `/webhook/chat` and render `output` from
the JSON response, maintaining a `sessionId` (e.g. a UUID stored in
`localStorage`) across messages in the same conversation:

```js
const sessionId = localStorage.getItem('chatSessionId') || crypto.randomUUID();
localStorage.setItem('chatSessionId', sessionId);

const res = await fetch('https://api.yourdomain.com/webhook/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, chatInput: userMessage }),
});
const { output } = await res.json();
```

If your site and the Worker are on different origins, `CORS_ALLOWED_ORIGIN`
in `wrangler.toml` controls what's allowed to call it — set it to your real
site origin instead of `*` before going live.

## Known differences from the n8n version

- **`waitUntil()` time budget**: the async post-chat scoring chain
  (score → research → Slack) runs inside `ctx.waitUntil()`. Cloudflare caps
  how long background tasks may run after the response is sent; if
  scoring/research retries eat too much of that budget, the whole chain gets
  cancelled mid-flight (`wrangler tail` shows: "waitUntil() tasks did not
  complete within the allowed time... and have been cancelled"). Keep an eye
  on this via `wrangler tail` if Slack alerts stop appearing for slow-scoring
  leads — the DB writes that happen earlier in the chain (status=Scored,
  status=Researched) can still land even if the final Slack post gets cut
  off. `POST /internal/score` runs the same chain outside a fire-and-forget
  context but still under the same `waitUntil()` for its own response.
- **Business research architecture**: rather than the source workflow's
  agentic tool-calling loop (LLM decides which tools to call), this port
  pre-fetches all 4 channels in parallel (website, LinkedIn, YouTube,
  Instagram) up front and hands the LLM real, already-fetched data to
  synthesize into a report. Simpler and faster (one LLM call instead of a
  multi-turn tool loop), same or better data coverage now that all 4
  channels are wired up (the source workflow only ever had Jina enabled).
- **Rate limiting** uses D1's serialized per-database writes instead of
  Postgres's atomic `INSERT ... ON CONFLICT ... RETURNING`. Fine at this
  traffic scale; revisit if you scale into concurrent-write territory.
- **No visual editor.** Editing the qualifying questions now means editing
  `src/types.ts` (`SLOTS` array) and redeploying, not dragging nodes in a UI.
- **Ads-Trigger not ported** — needs Facebook Lead Ads + Google Sheets OAuth,
  neither set up in the source system either. The scoring pipeline
  (`runScoringPipeline`) and its `POST /internal/score` entry point are
  already reusable if you add this later — you'd just need a route that
  creates the lead from an ad-platform webhook/poll and calls it.
- **Message-id dedup** for WhatsApp/Instagram uses a D1 table
  (`processed_messages`) instead of n8n's in-memory
  `$getWorkflowStaticData('global')` array, since Workers has no persistent
  memory between requests/isolates. Functionally equivalent, just durable.

## Multi-tenancy (product readiness)

Currently single-tenant (`tenant_id='default'` everywhere), but the schema
was kept generic so a second tenant doesn't require a rewrite:
- `tenants` / `tenant_config` tables already exist (per-tenant Slack webhook,
  service catalog, scoring ICP, rate limit, form link template).
- Every table (`leads`, `events`, `rate_limits`, `chat_sessions`) is already
  partitioned by `tenant_id`.

**Not yet built** for real multi-tenancy: routes/pipelines all hardcode
`tenant_id: "default"` rather than reading it from `tenant_config`, the form
page isn't parameterized by tenant (no `/form/:tenantId`), and there's no
onboarding flow to add a new tenant. Add these when a second client is
actually onboarded — building it speculatively now would be premature.

## Cost

Cloudflare Workers free tier: 100,000 requests/day. D1 free tier: 5GB storage,
5M rows read/day. For a lead-qualification chat widget, this is effectively
free indefinitely unless you get real production-scale traffic — at which
point you're on Workers Paid ($5/mo) rather than a VPS bill.
