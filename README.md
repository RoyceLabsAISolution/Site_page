# Royce Labs site

Marketing site for Royce Labs: an AI assistant that answers property enquiries on WhatsApp for Tamil Nadu real estate (English and Tamil, consent first, pilot in Coimbatore). Static HTML, CSS and vanilla JS, with one small Pages Function for the apply form.

## Layout

| Path | Purpose |
|------|---------|
| `public/index.html`, `public/ta/index.html` | Hand-edited English and Tamil homepages, with JSON-LD |
| `scripts/build-pages.js` | Generates `/cities/*`, `/guides/*`, `/apply/`, `/ta/apply/`, `/privacy/`, `/apply/thanks/` and `sitemap.xml`. Run `node scripts/build-pages.js`; do not hand-edit those pages |
| `functions/api/apply.js` | `POST /api/apply`: validates the pilot form and emails it via Resend (secrets `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL` live on the Pages project) |
| `public/apply.js` | Form behaviour; works as a plain POST without JS |
| `public/llms.txt` | Summary for AI assistants; keep in step with the homepage |
| `public/styles.css` | Styles |
| `public/app.js` | Nav, scroll reveal, FAQ accordion |
| `public/_headers` | Cloudflare Pages security headers and CSP |
| `public/og-image.png`, `logo-512.png`, `sitemap.xml`, `robots.txt` | Share image, logo and SEO files |
| `wrangler.toml` | Cloudflare Pages project (`roycelabs`) |

## Rules when editing

- Say only what `STATE.md` in the RE project says is proven. The product has been tested offline only, so keep the "built and tested offline" wording.
- The FAQ in `index.html` and the `FAQPage` JSON-LD must have identical text.
- Inline scripts are allowed by hash in `public/_headers`. If you change the inline `className="js"` script, regenerate its sha256 hash. The JSON-LD block is data and needs no hash.
- Positioning: call it an "AI assistant for real-estate enquiries" and keep WhatsApp as the channel. Avoid "lead management" as the product name (the one guide that targets that search phrase is the exception).
- Only Coimbatore is a live pilot. Other cities are waitlists, and other states are not served (English and Tamil only). Do not claim otherwise.
- After changing `scripts/build-pages.js` or the shared CSS/JS, bump `ASSET_V` and the `?v=` on the hand-edited pages. Update `dateModified`, the footer date and sitemap `lastmod` together.
- No price is published and no personal name, photo or phone number is shown on the site (deliberate: spam and harassment risk). The pilot is a small paid pilot with the fee agreed by email in writing; the apply form asks for email, with phone optional. Applications are emailed only; nothing is stored. If an email fails, the page offers a prefilled mailto fallback.

## Preview

```bash
cd public
python -m http.server 8080
```

## Deploy

Deploy only `public/` (never the whole folder: `.env` lives here, git-ignored).

```powershell
.\deploy.ps1   # needs CLOUDFLARE_API_TOKEN in .env
```

After deploying, check `curl -sI https://roycelabsai.in/` shows `content-security-policy` and `strict-transport-security`.

## Known to-dos

- Update `dateModified` (JSON-LD), the footer "Last updated" date and sitemap `lastmod` together, and only on real content changes.
- Add the WhatsApp click-to-chat button once there is a business number (`https://wa.me/91XXXXXXXXXX?text=...`).
- Search Console: submit the sitemap and watch AI-feature traffic under Web performance.
- Use a mailbox on `roycelabsai.in` instead of the Gmail address once one exists.
- Chat widget: bring back only with a stable backend (named Cloudflare tunnel) and a real-estate flow.
