# Royce Labs site

Single-page marketing site for Royce Labs: a WhatsApp lead agent for Tamil Nadu real estate (English and Tamil, consent first, pilot in Coimbatore). Plain HTML, CSS and vanilla JS. No build step.

## Layout

| Path | Purpose |
|------|---------|
| `public/index.html` | All page content, plus JSON-LD structured data |
| `public/styles.css` | Styles |
| `public/app.js` | Nav, scroll reveal, FAQ accordion |
| `public/_headers` | Cloudflare Pages security headers and CSP |
| `public/og-image.png`, `logo-512.png`, `sitemap.xml`, `robots.txt` | Share image, logo and SEO files |
| `wrangler.toml` | Cloudflare Pages project (`roycelabs`) |

## Rules when editing

- Say only what `STATE.md` in the RE project says is proven. The product has been tested offline only, so keep the "built and tested offline" wording.
- The FAQ in `index.html` and the `FAQPage` JSON-LD must have identical text.
- Inline scripts are allowed by hash in `public/_headers`. If you change the inline `className="js"` script, regenerate its sha256 hash. The JSON-LD block is data and needs no hash.
- Contact is a prefilled `mailto:` link. There is no form backend and no chat backend.

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
