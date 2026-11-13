# Royce Labs — Website

A fast, dependency-free marketing site for Royce Labs (done-for-you AI automation for small businesses). Plain HTML + CSS + vanilla JS — no build step, no frameworks. Loads instantly and hosts free anywhere.

## Files

| File | Purpose |
|------|---------|
| `index.html` | All page content (single page, anchor-linked sections) |
| `styles.css` | Design system: navy dark theme, tokens, layout, animations, responsive |
| `app.js` | Sticky nav, mobile menu, scroll-reveal, FAQ accordion |

## Chat widget backend

The AI chat widget (bottom-right, `#chatw` in `index.html`) talks directly to
the **`Lead-Qualification-Unified` n8n workflow** (self-hosted n8n running in
Podman on this machine — containers `n8n-workflows_n8n_1`/`_postgres_1`/
`_redis_1`), via its native LangChain Chat Trigger webhook:

`https://<tunnel-host>/webhook/17c02f1b-d583-49c1-ad84-052469571ab2/chat`

That workflow asks a slot-filling sequence (company name, contact, need,
budget, timeline, website/social), scores the completed lead with an LLM,
and on hot/warm leads posts a Slack alert and appends a Cal.com booking link
to the chat reply. Conversation state is tracked server-side in Postgres by
`sessionId`, so the widget only ever sends the latest message.

**Current exposure: a Cloudflare Quick Tunnel** (`cloudflared tunnel --url
http://localhost:5678`), because this Cloudflare account has no custom
domain/zone yet. This means:
- `CHAT_API` in `public/app.js` is a `*.trycloudflare.com` URL that **changes
  every time the tunnel process restarts** (machine reboot, process crash,
  etc.) — if the widget stops getting replies, re-run the tunnel, copy the
  new URL into `CHAT_API`, and redeploy.
- n8n itself must stay running (`podman ps` to check the 4 containers above)
  for the tunnel to have anything to forward to.

**To make this permanent:** add a real domain to this Cloudflare account as
a zone, then replace the quick tunnel with a named tunnel (`cloudflared
tunnel create`, map a hostname like `n8n.yourdomain.com` to it, add the DNS
record) — the hostname never changes after that, so `CHAT_API` is set once.

`functions/api/chat.js` (Workers AI + Resend email) is legacy/unused — kept
only in case you want to revert or repurpose it. It is not called by the
widget.

## Fill these in before publishing

Search-and-replace these placeholders across `index.html`:

| Placeholder | Replace with |
|-------------|--------------|
| `#BOOKING_LINK` | Your Cal.com / Calendly booking URL |
| `EMAIL@example.com` | Your business email |
| `#YOUTUBE` | `https://youtube.com/@RoyceLabsAISolution` |
| `#LINKEDIN` | Your LinkedIn Company Page URL (`linkedin.com/company/royce-labs`) |

That's it — everything else is real copy pulled from your strategy docs.

## Preview locally

Just open `index.html` in a browser. Or run a tiny server (nicer for testing):

```powershell
# from the site/ folder
python -m http.server 8080
# then visit http://localhost:8080
```

## Deploy (all free)

**Cloudflare Pages / Netlify (drag-and-drop):** drop the `site/` folder in — done.

**GitHub Pages:**
1. Push `site/` contents to a repo.
2. Settings -> Pages -> Deploy from branch -> `main` / root.

## Design system (for future edits)

- **Font:** Plus Jakarta Sans
- **Palette:** deep navy (`--navy-850` bg) + sky-blue accent (`--sky-500`)
- **Tokens** live at the top of `styles.css` under `:root` — change brand colors there once and everything updates.
- Icons are inline SVG (no emoji, no icon library to load).
- Animations respect `prefers-reduced-motion`.

## Brand voice reminder

Sell **outcomes, not "AI."** Every headline leads with the result (booked appointments, hours saved), never the tooling. Keep it honest and hype-free — that's the wedge.
