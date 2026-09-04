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
a separate Cloudflare Worker, not the `functions/api/chat.js` Pages Function
in this repo:

`https://leadqual-worker.officialroycelabs-ai.workers.dev/api/chat`

That Worker (source: `n8n-workflows/worker/` in a sibling project) runs a
hybrid flow: free-form FAQ answers grounded on this site's content, then
hands off to a structured 6-question lead-qualification flow (company name,
contact, need, budget, timeline, website/social) once a visitor shares
contact info or shows buying intent. Completed leads get scored with an LLM
(BANT framework) and posted to Slack.

`functions/api/chat.js` (Workers AI + Resend email) is no longer called by
the widget as of the `app.js` update pointing at `CHAT_API` above, but is
left in place/deployed in case you want to revert or reuse it elsewhere.

If you move the Worker to a custom domain, update `CHAT_API` in
`public/app.js` and the `CORS_ALLOWED_ORIGIN` var in the Worker's
`wrangler.toml` to match.

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
