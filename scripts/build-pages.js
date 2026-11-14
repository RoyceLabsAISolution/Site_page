// Generates the static city pages, guides and hub pages into public/.
// Run:  node scripts/build-pages.js     (no dependencies; output is plain HTML, committed as-is)
// The home page (public/index.html) and Tamil page (public/ta/index.html) are hand-edited.
"use strict";
const fs = require("fs");
const path = require("path");

const SITE = "https://roycelabsai.in";
const OUT = path.join(__dirname, "..", "public");
const EMAIL = "hello@roycelabsai.in";
const DATE = "2026-11-14";
const DATE_LONG = "14 November 2026";
const ASSET_V = "6";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const write = (rel, html) => {
  const file = path.join(OUT, rel, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html.replace(/\r?\n/g, "\n"), "utf8");
  console.log("wrote", path.relative(OUT, file));
};
const applyHref = (city) => "/apply/" + (city ? "?city=" + encodeURIComponent(city) : "");
const mailto = (subject, body) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&amp;body=${encodeURIComponent(body)}`;

const ORG = {
  "@type": "Organization",
  "@id": SITE + "/#organization",
  name: "Royce Labs AI Solutions",
  url: SITE + "/",
  logo: SITE + "/logo-512.png",
};

// ---------- shared chrome ----------
const TICK = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>';

const CITIES = [
  { slug: "coimbatore", name: "Coimbatore", pilot: true },
  { slug: "chennai", name: "Chennai" },
  { slug: "madurai", name: "Madurai" },
  { slug: "tiruchirappalli", name: "Tiruchirappalli", short: "Trichy" },
  { slug: "salem", name: "Salem" },
  { slug: "tiruppur", name: "Tiruppur" },
];

const GUIDES = [
  {
    slug: "whatsapp-lead-management-real-estate-india",
    title: "WhatsApp lead management for real estate in India: a practical guide",
    short: "WhatsApp lead management for real estate in India",
    seo: "WhatsApp Lead Management for Real Estate in India | Royce Labs",
    desc: "How Indian developers and agencies can reply to property enquiries on WhatsApp: what to automate, what to keep human, opt-in rules and what to ask a vendor.",
  },
  {
    slug: "dpdp-consent-whatsapp-real-estate-leads",
    title: "DPDP Act and WhatsApp real-estate leads: a consent checklist",
    short: "DPDP consent checklist for WhatsApp real-estate leads",
    seo: "DPDP Consent Checklist: WhatsApp Property Leads | Royce Labs",
    desc: "A plain-language consent checklist for Indian real-estate teams that collect buyer details on WhatsApp under the DPDP Act, 2023. Not legal advice.",
  },
  {
    slug: "tamil-nadu-property-terms-patta-chitta-dtcp-cmda-rera",
    title: "Tamil Nadu property terms explained: patta, chitta, DTCP, CMDA, RERA, cent and ground",
    short: "Tamil Nadu property terms: patta, chitta, DTCP, CMDA, RERA, cent, ground",
    seo: "Patta, Chitta, DTCP, CMDA, RERA Explained | Royce Labs",
    desc: "A glossary of the terms Tamil Nadu property buyers use in chats: patta, chitta, EC, DTCP, CMDA, TNRERA, cent, ground, lakh and crore.",
  },
];

function head({ title, desc, path: p, ogType = "website", jsonld, lang = "en-IN", extra = "", robots = "index, follow, max-image-preview:large, max-snippet:-1" }) {
  const url = SITE + p;
  return `<!DOCTYPE html>
<html lang="${lang}" class="no-js">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="google-site-verification" content="VewmmkthEhn0U_jX5xlK8VT5srBdzetSQsjM-4pJTKk" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="author" content="Royce Labs AI Solutions" />
<meta name="robots" content="${robots}" />
<meta name="theme-color" content="#F6F1E7" />
<link rel="canonical" href="${url}" />
${extra}<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/logo-512.png" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="Royce Labs AI Solutions" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:locale" content="en_IN" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Fraunces:ital,wght@0,500;0,600;1,500&family=Noto+Sans+Tamil:wght@400;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/styles.css?v=${ASSET_V}" />
<script>document.documentElement.className="js";</script>
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header()}
<main id="main">
`;
}

function header() {
  const links = `<a href="/#how">How it works</a>
      <a href="/cities/">Cities</a>
      <a href="/guides/">Guides</a>
      <a href="/#pilot">Pilot</a>
      <a href="/ta/" lang="ta" hreflang="ta-IN">தமிழ்</a>`;
  return `<header class="nav" id="nav">
  <div class="container nav__inner">
    <a class="brand" href="/" aria-label="Royce Labs home"><span class="brand__mark" aria-hidden="true">R</span>Royce Labs</a>
    <nav class="nav__links" aria-label="Primary">
      ${links}
    </nav>
    <a class="btn btn--primary nav__cta" href="/#contact">Join the pilot</a>
    <button class="nav__toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu"><span></span><span></span><span></span></button>
  </div>
  <div class="mobile-menu" id="mobileMenu" hidden>
    ${links.replace(/\n      /g, "\n    ")}
    <a class="btn btn--primary" href="/#contact">Join the pilot</a>
  </div>
</header>`;
}

function footer(opts = {}) {
  return `</main>

<footer class="footer">
  <div class="container footer__grid">
    <div>
      <a class="brand" href="/"><span class="brand__mark" aria-hidden="true">R</span>Royce Labs</a>
      <p>Real-estate enquiry service on WhatsApp, Tamil Nadu first. English and Tamil, consent first, run for you.</p>
    </div>
    <nav aria-label="Cities">
      <h4>Cities</h4>
      ${CITIES.map((c) => `<a href="/cities/${c.slug}/">${c.name}</a>`).join("\n      ")}
    </nav>
    <nav aria-label="Guides">
      <h4>Guides</h4>
      ${GUIDES.map((g) => `<a href="/guides/${g.slug}/">${esc(g.short)}</a>`).join("\n      ")}
      <a href="/ta/" lang="ta">தமிழில் படிக்க</a>
    </nav>
    <div>
      <h4>Connect</h4>
      <a href="mailto:${EMAIL}">${EMAIL}</a>
      <a href="https://www.linkedin.com/company/royce-labs-ai-solution" target="_blank" rel="noopener">LinkedIn</a>
      <a href="https://www.instagram.com/royces_labs_ai" target="_blank" rel="noopener">Instagram</a>
      <a href="https://www.youtube.com/channel/UCelMLRYF-I6_yd0IA4vyUeg" target="_blank" rel="noopener">YouTube</a>
    </div>
  </div>
  <div class="container footer__bottom">
    <p>&copy; 2026 Royce Labs. Real-estate enquiry service on WhatsApp, Tamil Nadu first.</p>
    <p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · Last updated <time datetime="${DATE}">${DATE_LONG}</time></p>
  </div>
</footer>

<script src="/app.js?v=${ASSET_V}"></script>
${opts.script ? `<script src="${opts.script}?v=${ASSET_V}"></script>\n` : ""}</body>
</html>
`;
}

const crumbs = (items) =>
  `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map((it, i) => (i === items.length - 1 ? `<li aria-current="page">${esc(it.name)}</li>` : `<li><a href="${it.path}">${esc(it.name)}</a></li>`))
    .join("")}</ol></nav>`;

const crumbLd = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE + it.path })),
});

const faqLd = (faq) => ({
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});
const faqHtml = (faq) =>
  `<div class="faq">\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><div class="a">${esc(a)}</div></details>`).join("\n")}\n    </div>`;

// ---------- city pages ----------
const CITY_DATA = {
  coimbatore: {
    areas: ["Saravanampatti", "Vilankurichi", "Singanallur", "Peelamedu", "Kovaipudur", "Sulur", "Thudiyalur", "Ganapathy"],
    unit: "cents and square feet",
    approvals: "DTCP-approved layouts and a RERA registration number where the project needs one",
    chat: [
      ["in", "Hi, 3 cent plot Coimbatore la irukka? Budget 40 lakh"],
      ["out", "Vanakkam! I'm an automated assistant for [Your agency]. May I save your requirement so our team can follow up? Reply YES or NO."],
      ["in", "YES"],
      ["out", "Thanks. 2 DTCP-approved plots match: Saravanampatti 3 cent, Vilankurichi 3.2 cent. Want to visit this weekend?"],
    ],
    asks: [
      "Is the layout DTCP-approved, and does it have a RERA number?",
      "Is there a 3 cent or 5 cent plot in my budget, near Saravanampatti or Sulur?",
      "Can I visit this Saturday or Sunday?",
      "Is the plot corner or road-facing?",
    ],
    q4: ["Does it understand cents, DTCP and RERA in Coimbatore chats?", "Yes. It understands cent and square-foot sizes, lakh and crore budgets, and terms such as DTCP, RERA, patta and chitta in buyer messages. It does not verify any approval itself. It shows only the listing details you give us, including the approval or RERA number you provide."],
    lead: "Coimbatore is our pilot city. We are opening 2 to 3 pilot places with plot and layout developers and agencies here.",
  },
  chennai: {
    areas: ["Porur", "Sholinganallur", "Medavakkam", "Tambaram", "Guduvancheri", "Avadi", "Poonamallee", "Perumbakkam"],
    unit: "grounds, cents and square feet",
    approvals: "CMDA or DTCP approval and a TNRERA registration number where the project needs one",
    chat: [
      ["in", "Hi, Porur pakkam 2BHK flat irukka? Budget 75 lakh, RERA registered ah?"],
      ["out", "Vanakkam! I'm an automated assistant for [Your agency]. May I save your requirement so our team can follow up? Reply YES or NO."],
      ["in", "YES"],
      ["out", "Thanks. 2 listings match your budget in Porur. The RERA number is shown on each. Want a site visit this weekend?"],
    ],
    asks: [
      "Is it CMDA-approved and TNRERA-registered? What is the RERA number?",
      "What is the price per ground, and how many square feet is that?",
      "Is the flat or plot on the OMR side, near Porur, or near Tambaram?",
      "Can I see it on Sunday?",
    ],
    q4: ["Does it understand grounds, CMDA and RERA in Chennai chats?", "Yes. It understands ground (2,400 sq ft), cent and square-foot sizes, lakh and crore budgets, and terms such as CMDA, DTCP, RERA, patta and chitta in buyer messages. It does not verify any approval itself. It shows only the details and RERA number you give us for each listing."],
    lead: "Chennai is the next city we plan to open after the Coimbatore pilot. We are taking names from Chennai developers and agencies now.",
  },
  madurai: {
    areas: ["Anna Nagar", "K. Pudur", "Thirumangalam", "Thirupparankundram", "Vilangudi", "Mattuthavani"],
    unit: "cents and square feet",
    approvals: "DTCP-approved layouts and a RERA registration number where the project needs one",
    chat: [
      ["in", "Hi, Thirumangalam side 2 cent plot irukka? Budget 18 lakh"],
      ["out", "Vanakkam! I'm an automated assistant for [Your agency]. May I save your requirement so our team can follow up? Reply YES or NO."],
      ["in", "YES"],
      ["out", "Thanks. 2 DTCP-approved plots match near Thirumangalam. Want to visit this weekend?"],
    ],
    asks: [
      "Is the layout DTCP-approved?",
      "Is there a 2 cent or 3 cent plot in my budget near Thirumangalam or K. Pudur?",
      "Is there a clear patta, and can I see the chitta?",
      "Can I visit on Sunday?",
    ],
    q4: ["Does it understand patta, chitta and DTCP in Madurai chats?", "Yes. It understands cent and square-foot sizes, lakh and crore budgets, and terms such as patta, chitta, DTCP and RERA in buyer messages. It does not check any document itself. It shows only the listing details you give us."],
    lead: "Madurai is on our list after Coimbatore and Chennai. We are taking names from Madurai developers and agencies now.",
  },
  tiruchirappalli: {
    areas: ["Srirangam", "Thillai Nagar", "K.K. Nagar", "Ariyamangalam", "Thiruverumbur", "Woraiyur"],
    unit: "cents and square feet",
    approvals: "DTCP-approved layouts and a RERA registration number where the project needs one",
    chat: [
      ["in", "Hi, Srirangam pakkam 1500 sq ft plot irukka? Budget 35 lakh"],
      ["out", "Vanakkam! I'm an automated assistant for [Your agency]. May I save your requirement so our team can follow up? Reply YES or NO."],
      ["in", "YES"],
      ["out", "Thanks. 2 DTCP-approved plots match near Srirangam. Want to visit this weekend?"],
    ],
    asks: [
      "Is the layout DTCP-approved, and is there a RERA number?",
      "Is there a plot near Srirangam, K.K. Nagar or Thillai Nagar in my budget?",
      "What is the size in cents and in square feet?",
      "Can the team show me the plot this weekend?",
    ],
    q4: ["Does it understand square feet, cents and DTCP in Trichy chats?", "Yes. It understands cent and square-foot sizes, lakh and crore budgets, and terms such as DTCP, RERA, patta and chitta in buyer messages. It does not verify any approval itself. It shows only the listing details you give us."],
    lead: "Tiruchirappalli (Trichy) is on our list after Coimbatore. We are taking names from Trichy developers and agencies now.",
  },
  salem: {
    areas: ["Fairlands", "Hasthampatti", "Ammapet", "Suramangalam", "Alagapuram", "Omalur", "Kondalampatti"],
    unit: "cents and square feet",
    approvals: "DTCP-approved layouts and a RERA registration number where the project needs one",
    chat: [
      ["in", "Hi, Omalur road side 3 cent plot irukka? Budget 20 lakh"],
      ["out", "Vanakkam! I'm an automated assistant for [Your agency]. May I save your requirement so our team can follow up? Reply YES or NO."],
      ["in", "YES"],
      ["out", "Thanks. 2 DTCP-approved plots match near Omalur. Want to visit this weekend?"],
    ],
    asks: [
      "Is the layout DTCP-approved?",
      "Is there a 3 cent plot near Omalur, Ammapet or Fairlands in my budget?",
      "Is the plot road-facing, and how wide is the road?",
      "Can I visit on Sunday?",
    ],
    q4: ["Does it understand cents and DTCP in Salem chats?", "Yes. It understands cent and square-foot sizes, lakh and crore budgets, and terms such as DTCP, RERA, patta and chitta in buyer messages. It does not verify any approval itself. It shows only the listing details you give us."],
    lead: "Salem is on our list after Coimbatore. We are taking names from Salem developers and agencies now.",
  },
  tiruppur: {
    areas: ["Avinashi Road", "Palladam Road", "Kangeyam Road", "Veerapandi", "Perumanallur", "Anupparpalayam"],
    unit: "cents and square feet",
    approvals: "DTCP-approved layouts and a RERA registration number where the project needs one",
    chat: [
      ["in", "Hi, Palladam road side 2 cent plot irukka? Budget 25 lakh"],
      ["out", "Vanakkam! I'm an automated assistant for [Your agency]. May I save your requirement so our team can follow up? Reply YES or NO."],
      ["in", "YES"],
      ["out", "Thanks. 2 DTCP-approved plots match near Palladam Road. Want to visit this weekend?"],
    ],
    asks: [
      "Is the layout DTCP-approved?",
      "Is there a 2 cent plot near Palladam Road or Avinashi Road in my budget?",
      "Is there a RERA number, and a clear patta?",
      "Can I visit on Sunday?",
    ],
    q4: ["Does it understand cents and DTCP in Tiruppur chats?", "Yes. It understands cent and square-foot sizes, lakh and crore budgets, and terms such as DTCP, RERA, patta and chitta in buyer messages. It does not verify any approval itself. It shows only the listing details you give us."],
    lead: "Tiruppur is on our list after Coimbatore. We are taking names from Tiruppur developers and agencies now.",
  },
};

function cityPage(c) {
  const d = CITY_DATA[c.slug];
  const nm = c.name;
  const p = `/cities/${c.slug}/`;
  const title = `Real-Estate Enquiry Service for ${nm} | Royce Labs`;
  const desc = c.pilot
    ? `WhatsApp enquiry service for ${nm} developers and agencies, using an automated AI assistant: English and Tamil replies, consent first, site visits to your team. Pilot places open.`
    : `WhatsApp enquiry service for ${nm} real estate, using an automated AI assistant: English and Tamil replies, consent first, site visits to your team. Join the ${nm} waitlist.`;
  const faq = [
    [`Is Royce Labs live in ${nm}?`, c.pilot
      ? "Coimbatore is our pilot city. We are opening 2 to 3 pilot places there now. The product is built and tested offline; the pilot is its first live run, and we will tell you plainly what has and has not been proven."
      : `Not yet. Our first pilot is in Coimbatore. We are taking names from ${nm} developers and agencies, and will open ${nm} after the Coimbatore pilot shows it works. We will tell you plainly what has and has not been proven.`],
    [`Which languages does it use with ${nm} buyers?`, "English and Tamil replies. It reads Tanglish (Tamil typed in English letters), and understands lakh and crore, cents and square feet."],
    d.q4,
    [`Does it quote prices or book site visits in ${nm}?`, "No. It never quotes or negotiates a price, takes money or ID documents, or books a visit by itself. Buyers can ask for a visit and your team confirms or declines."],
    [`What does it cost in ${nm}?`, c.pilot
      ? "Applying is free. The Coimbatore pilot is a small paid pilot: we agree the fee with you by email, in writing, before anything starts. After the pilot, a simple monthly plan plus a one-time setup fee, also agreed in writing before you commit."
      : `Joining the waitlist is free. Our first pilot is in Coimbatore, and we agree its fee with each partner by email, in writing. ${nm} would be agreed the same way when we open there. Fees may change as we learn from the first customers.`],
  ];
  const items = [{ name: "Home", path: "/" }, { name: "Cities", path: "/cities/" }, { name: nm, path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      { "@type": "WebPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "en-IN", dateModified: DATE, breadcrumb: { "@id": SITE + p + "#breadcrumb" }, about: { "@id": SITE + p + "#service" } },
      { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" },
      {
        "@type": "Service",
        "@id": SITE + p + "#service",
        name: `Real-estate enquiry service for ${nm}`,
        serviceType: "Real-estate enquiry service on WhatsApp",
        provider: { "@id": SITE + "/#organization" },
        areaServed: { "@type": "City", name: nm, containedInPlace: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" } },
        audience: { "@type": "BusinessAudience", audienceType: "Plot and layout developers, real-estate agencies and brokers" },
        description: `A WhatsApp assistant for ${nm} real-estate teams: replies in English and Tamil, asks consent before saving anything, captures budget, location and size, shows up to three matching listings and passes site-visit requests to your team.`,
        ...(c.pilot ? { offers: { "@type": "Offer", name: "30-day paid pilot", description: "Small paid pilot; the fee is agreed by email, in writing, before anything starts.", url: SITE + p, availability: "https://schema.org/LimitedAvailability", eligibleRegion: { "@type": "City", name: nm } } } : {}),
      },
      { ...faqLd(faq), "@id": SITE + p + "#faq" },
    ],
  };
  const others = CITIES.filter((x) => x.slug !== c.slug);
  const subject = c.pilot ? "Pilot - Coimbatore" : `Waitlist - ${nm}`;
  const body = `Business name:\r\nCity: ${nm}\r\nWhere your enquiries come from (ads, boards, portals):\r\nAbout how many enquiries a week:\r\nPhone:`;
  const cta = c.pilot ? "Apply for a pilot place" : `Join the ${nm} waitlist`;
  return (
    head({ title, desc, path: p, jsonld }) +
    `<section class="hero hero--sub">
  <div class="container hero__inner">
    <div>
      ${crumbs(items)}
      <span class="eyebrow">${c.pilot ? "Pilot open in " + nm : nm + " waitlist"}</span>
      <h1>Real-estate enquiry service for <em>${nm}</em></h1>
      <p class="lede">${esc(d.lead)} A buyer messages your WhatsApp Business number; the assistant replies in English or Tamil, asks consent, captures the requirement and passes a site-visit request to your team.</p>
      <div class="hero__cta">
        <a class="btn btn--primary btn--lg" href="${applyHref(nm)}">${cta}</a>
        <a class="btn btn--ghost btn--lg" href="/#how">How it works</a>
      </div>
      <ul class="hero__proof">
        <li>${TICK}Consent asked first</li>
        <li>${TICK}Your team closes the deal</li>
        <li>${TICK}English and Tamil</li>
      </ul>
    </div>
    <div class="phone-wrap" role="img" aria-label="Example WhatsApp conversation with sample listings for ${nm}.">
      <span class="example-tag">Example conversation</span>
      <div class="phone" aria-hidden="true">
        <div class="phone__screen">
          <div class="phone__bar"><span class="phone__av">Y</span><div><strong>[Your agency]</strong><span>Automated assistant</span></div></div>
          <div class="thread">
${d.chat.map(([w, t]) => `            <div class="bubble bubble--${w}">${esc(t)}</div>`).join("\n")}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="inshort" aria-label="In short">
  <div class="container">
    <p><strong>In short:</strong> Royce Labs is an enquiry service for real-estate developers and agencies in ${nm}, Tamil Nadu. It answers property enquiries on WhatsApp using an automated AI assistant: it replies in English or Tamil, asks consent before saving anything, captures budget, location and size, shows up to three matching listings from your own inventory and passes a site-visit request to your team. It never books a visit, quotes a price or takes money. ${c.pilot ? "The 30-day pilot is a small paid pilot, with the fee agreed by email before it starts." : "Our first pilot is in Coimbatore; " + nm + " is next on the list."}</p>
  </div>
</section>

<section class="section">
  <div class="container container--narrow prose">
    <h2>What ${nm} buyers typically ask on WhatsApp</h2>
    <p>Buyers usually write in a mix of English and Tamil. The assistant is built to handle questions like these, using only the listings and approval details you give it:</p>
    <ul class="bul">
${d.asks.map((a) => `      <li>${esc(a)}</li>`).join("\n")}
    </ul>
    <h2>Areas and terms it understands</h2>
    <p>Common ${nm} areas buyers mention include ${d.areas.map(esc).join(", ")}. Sizes are usually in ${d.unit}, and budgets in lakh and crore. The assistant also recognises approval and record terms in buyer messages, such as ${c.slug === "chennai" ? "CMDA, DTCP, TNRERA" : "DTCP, TNRERA"}, patta and chitta. It does not verify any of them; it shows only what you load. See the <a href="/guides/tamil-nadu-property-terms-patta-chitta-dtcp-cmda-rera/">glossary of Tamil Nadu property terms</a>.</p>
    <p class="note">It reads the area names and terms in a buyer's message; it only shows listings that you load. The area names above are examples of what buyers write, not a list of projects.</p>

    <h2>How it works for a ${nm} developer or agency</h2>
    <ol class="plain">
      <li><b>Buyer messages you</b> on your own WhatsApp Business number, registered to your business. The assistant says it is automated and asks consent before saving anything.</li>
      <li><b>Requirement captured:</b> budget, location, property type, size and timeline.</li>
      <li><b>Matching listings shown:</b> up to three from your own inventory. It never invents a plot or quotes a price.</li>
      <li><b>Your team takes over:</b> a buyer can ask for a person at any time, and you confirm or decline every site visit in the broker console.</li>
    </ol>

    <h2>Where we are today in ${nm}</h2>
    <p>${c.pilot ? "Built and tested offline: the English and Tamil conversation, consent handling, listing matching and the broker console. Not yet proven: live WhatsApp with real buyers. Your Coimbatore pilot is its first live run." : `We have not run a live pilot in ${nm}. The product is built and tested offline, and our first live run is the Coimbatore pilot. If you join the ${nm} waitlist, we will tell you when we are ready to open here, and what the Coimbatore pilot has and has not proven.`}</p>
  </div>
</section>

<section class="section section--paper">
  <div class="container container--narrow">
    <div class="head"><span class="eyebrow">FAQ</span><h2>${nm}: straight answers.</h2></div>
    ${faqHtml(faq)}
  </div>
</section>

<section class="section">
  <div class="container container--narrow prose">
    <h2>Other cities and guides</h2>
    <ul class="linkgrid">
${others.map((o) => `      <li><a href="/cities/${o.slug}/">${o.name}</a></li>`).join("\n")}
      <li><a href="/guides/whatsapp-lead-management-real-estate-india/">Guide: WhatsApp lead management in India</a></li>
      <li><a href="/guides/dpdp-consent-whatsapp-real-estate-leads/">Guide: DPDP consent checklist</a></li>
    </ul>
  </div>
</section>

<section class="cta">
  <div class="container">
    <span class="eyebrow">${c.pilot ? "Pilot places · Coimbatore" : nm + " waitlist"}</span>
    <h2>${c.pilot ? "Want to be one of the first three?" : `Want ${nm} opened sooner?`}</h2>
    <p>Fill a 20-second form with your name, email and city. We reply by email with a plain plan.</p>
    <div class="cta__actions"><a class="btn btn--light btn--lg" href="${applyHref(nm)}">${cta}</a></div>
  </div>
</section>
` +
    footer()
  );
}

// ---------- hubs ----------
function citiesIndex() {
  const p = "/cities/";
  const title = "Real-Estate Enquiry Service by City in Tamil Nadu | Royce Labs";
  const desc = "Royce Labs real-estate enquiry service in Coimbatore (pilot open), Chennai, Madurai, Tiruchirappalli, Salem and Tiruppur. English and Tamil, consent first.";
  const items = [{ name: "Home", path: "/" }, { name: "Cities", path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      { "@type": "CollectionPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "en-IN", dateModified: DATE, breadcrumb: { "@id": SITE + p + "#breadcrumb" } },
      { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" },
      { "@type": "ItemList", itemListElement: CITIES.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: `${SITE}/cities/${c.slug}/` })) },
    ],
  };
  return (
    head({ title, desc, path: p, jsonld }) +
    `<section class="section">
  <div class="container container--narrow prose">
    ${crumbs(items)}
    <span class="eyebrow">Where we work</span>
    <h1>Real-estate enquiry service for Tamil Nadu, city by city</h1>
    <p class="lede">Royce Labs is built for Indian real estate, Tamil Nadu first. Our first pilot is in Coimbatore. The other cities below are taking names now and open after the Coimbatore pilot shows it works. We have not run a live pilot outside Coimbatore.</p>
    <ul class="citylist">
${CITIES.map((c) => `      <li><a href="/cities/${c.slug}/"><strong>${c.name}</strong><span>${c.pilot ? "Pilot places open" : "Waitlist open"}</span></a></li>`).join("\n")}
    </ul>
    <p>Outside Tamil Nadu? The assistant currently replies in English and Tamil only, so we are not taking pilots in other states yet. <a href="${applyHref("Outside Tamil Nadu")}">Tell us where you are</a> and which languages your buyers use; it helps us decide what to build next.</p>
  </div>
</section>
` +
    footer()
  );
}

function guidesIndex() {
  const p = "/guides/";
  const title = "Guides for Indian Real-Estate Teams | Royce Labs";
  const desc = "Plain-language guides for Indian real-estate teams: WhatsApp lead management, DPDP consent for buyer data, and Tamil Nadu property terms explained.";
  const items = [{ name: "Home", path: "/" }, { name: "Guides", path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      { "@type": "CollectionPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "en-IN", dateModified: DATE, breadcrumb: { "@id": SITE + p + "#breadcrumb" } },
      { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" },
      { "@type": "ItemList", itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: `${SITE}/guides/${g.slug}/` })) },
    ],
  };
  return (
    head({ title, desc, path: p, jsonld }) +
    `<section class="section">
  <div class="container container--narrow prose">
    ${crumbs(items)}
    <span class="eyebrow">Guides</span>
    <h1>Guides for Indian real-estate teams</h1>
    <p class="lede">Short, practical and honest about what is law, what is practice and what we have not verified.</p>
    <ul class="citylist">
${GUIDES.map((g) => `      <li><a href="/guides/${g.slug}/"><strong>${esc(g.title)}</strong><span>${esc(g.desc)}</span></a></li>`).join("\n")}
    </ul>
  </div>
</section>
` +
    footer()
  );
}

// ---------- guides ----------
const G = {};

G["whatsapp-lead-management-real-estate-india"] = {
  answer: "WhatsApp lead management means replying to property enquiries on WhatsApp quickly, capturing what the buyer wants, and handing a ready lead to a person. For Indian developers and agencies, the practical rules are: get the buyer's opt-in, reply in the buyer's language, never let automation quote prices or take money, and keep a person in charge of site visits.",
  body: `
    <h2>Why WhatsApp for property enquiries in India</h2>
    <p>Most property enquiries in India arrive as a message: from an ad, a site board, a portal listing or a referral. Buyers tend to message several developers and stay with the one that answers first and clearly. A team on site visits cannot reply to every message within minutes, so enquiries wait until the next day.</p>
    <h2>What to automate, and what to keep human</h2>
    <table class="tbl">
      <thead><tr><th>Automate</th><th>Keep with a person</th></tr></thead>
      <tbody>
        <tr><td>First reply, in the buyer's language</td><td>Price quotes and negotiation</td></tr>
        <tr><td>Asking consent before saving details</td><td>Taking money, booking amounts or ID documents</td></tr>
        <tr><td>Capturing budget, location, size, timeline</td><td>Confirming a site visit</td></tr>
        <tr><td>Showing matching listings from your own inventory</td><td>Anything about legal status of a plot or project</td></tr>
        <tr><td>Logging the lead and the consent status</td><td>Follow-up calls</td></tr>
      </tbody>
    </table>
    <h2>Opt-in, the 24-hour window and templates</h2>
    <p>On the WhatsApp Business Platform, a business can reply freely while the buyer's conversation is active, which Meta calls the customer service window and sets at 24 hours from the buyer's last message. After that window, a business generally needs an approved message template, and WhatsApp's policies expect the person to have opted in to hear from you. This is why a first-reply system for buyers who message you first is simpler and safer than outbound campaigns. Check Meta's current policy and pricing, as both change.</p>
    <h2>Language matters more than people expect</h2>
    <p>Buyers in Tamil Nadu often write Tamil in English letters (Tanglish), mix in English, and use units like cents and grounds and amounts like lakh and crore. A system that only understands formal English will mishandle many ordinary enquiries. Ask any vendor to show you a real Tanglish conversation, not a slide.</p>
    <h2>Ten questions to ask a WhatsApp lead-management vendor</h2>
    <ol class="plain">
      <li>Does it tell the buyer it is automated?</li>
      <li>Does it ask consent before saving a name, number or requirement?</li>
      <li>What happens when the buyer says STOP or "no"?</li>
      <li>Can it quote a price or invent a listing? (It should not.)</li>
      <li>Which languages does it actually handle, and can you see them live?</li>
      <li>Who owns the lead data, and can you export it?</li>
      <li>Does a person confirm every site visit?</li>
      <li>What has been proven with real buyers, and what has only been tested offline?</li>
      <li>Is there a lock-in, and what does it cost after any pilot?</li>
      <li>Who fixes it when something breaks?</li>
    </ol>
    <p>Our own answers: the assistant says it is automated, asks consent first, stops on STOP or "no", never quotes prices or invents listings, handles English and Tamil, and a person confirms every visit. It is built and tested offline; live WhatsApp with real buyers is not yet proven, and the Coimbatore pilot is its first live run.</p>
    <h2>Related</h2>
    <ul class="bul">
      <li><a href="/guides/dpdp-consent-whatsapp-real-estate-leads/">DPDP consent checklist for WhatsApp leads</a></li>
      <li><a href="/cities/coimbatore/">Real-estate enquiry service for Coimbatore (pilot open)</a></li>
      <li><a href="/#faq">Royce Labs FAQ</a></li>
    </ul>`,
  faq: [
    ["Is WhatsApp lead management legal in India?", "Using WhatsApp to reply to people who message you is ordinary business practice. What matters is how you handle their personal data, which falls under India's Digital Personal Data Protection Act, 2023, and WhatsApp's own business policies. This is general information, not legal advice; ask a lawyer about your own setup."],
    ["Can a bot quote a price or take a booking amount?", "It should not. Prices, negotiation, booking amounts and ID documents should stay with a person on your team."],
    ["Do I need the WhatsApp Business Platform, or is the Business app enough?", "The Business app suits one person replying manually. Automation, multiple team members and a lead console generally need the WhatsApp Business Platform. Check Meta's current rules and pricing."],
  ],
};

G["dpdp-consent-whatsapp-real-estate-leads"] = {
  answer: "Under India's Digital Personal Data Protection Act, 2023, consent for personal data must be free, specific, informed, unconditional and unambiguous, given by a clear affirmative action, and the person must be able to withdraw it as easily as they gave it. For WhatsApp property leads, that means saying who you are, why you want the buyer's details, asking a clear yes or no before saving anything, and honouring STOP.",
  legal: true,
  body: `
    <p class="callout"><strong>Not legal advice.</strong> This checklist is general information written by a software company, and it has not been reviewed by a lawyer. The Rules under the Act are being phased in, and details can change. Confirm anything you rely on with qualified counsel or the official text.</p>
    <h2>Where the law stands</h2>
    <p>The Digital Personal Data Protection Act, 2023 is India's data protection law. The Digital Personal Data Protection Rules, 2025 were notified in November 2025. Published summaries describe a phased rollout over about 18 months from notification, with the main obligations on businesses expected to apply around May 2027. Check the exact dates in the official text; do not rely on this page for them.</p>
    <h2>What "consent" must look like</h2>
    <ul class="bul">
      <li><b>Free and unconditional:</b> do not make an unrelated service depend on agreeing to extra data use.</li>
      <li><b>Specific and informed:</b> tell the buyer what you will save and why (for example, "your name, number, budget and area, so our team can follow up about plots"), before you ask.</li>
      <li><b>Unambiguous, with a clear affirmative action:</b> a clear "YES" in the chat. Silence, "maybe" or a pre-ticked box is not consent.</li>
      <li><b>Withdrawable:</b> stopping should be as easy as agreeing. A simple "STOP" should end messaging and trigger deletion or restriction as your policy says.</li>
      <li><b>Notice:</b> the Act and Rules expect a clear notice in plain language, and in some cases in the languages in the Constitution's Eighth Schedule, which includes Tamil. Ask counsel what applies to you.</li>
    </ul>
    <h2>A practical checklist for WhatsApp property leads</h2>
    <ol class="plain">
      <li>Say in the first reply that the buyer is talking to an automated assistant.</li>
      <li>Ask consent before saving a name, number or requirement, and say what for.</li>
      <li>Treat anything other than a clear yes as no.</li>
      <li>Stop messaging on STOP or "no", and record that consent was withdrawn.</li>
      <li>Store the consent status and time with each lead.</li>
      <li>Collect only what you need. Do not collect ID documents or money in the chat.</li>
      <li>Do not message people who never contacted you without a lawful basis your lawyer has checked.</li>
      <li>Decide who is responsible for the data (you as the developer or agency, and any vendor acting for you) and put it in writing.</li>
      <li>Have a way for buyers to ask what you hold and to ask you to delete it.</li>
      <li>Keep a plain-language privacy notice and link to it.</li>
    </ol>
    <h2>How our assistant is built around this</h2>
    <p>The Royce Labs assistant says it is automated, asks for consent before saving anything, treats silence or "maybe" as no, stops on STOP or "no", and does not take money or ID documents. You own your leads; we handle them only on your behalf. Outbound messages and calls to people who have not contacted you stay off until a lawyer has checked the consent and telecom rules. None of that makes your business compliant by itself; it is a design that supports compliance.</p>
    <h2>Related</h2>
    <ul class="bul">
      <li><a href="/guides/whatsapp-lead-management-real-estate-india/">WhatsApp lead management for real estate in India</a></li>
      <li><a href="/#trust">What the assistant always does and never does</a></li>
    </ul>`,
  faq: [
    ["Do I need consent to reply to a buyer who messaged me first?", "Replying to someone who contacted you is ordinary. Saving and using their personal data is where consent or another lawful basis comes in. Ask your lawyer which basis applies to your case; our assistant asks for consent before saving anything."],
    ["Does consent have to be in Tamil?", "The Rules expect notices to be clear and plain, and in some cases to be available in languages in the Eighth Schedule of the Constitution, which includes Tamil. Our assistant replies in English or Tamil to match the buyer. Confirm what applies to you with counsel."],
    ["Is this page legal advice?", "No. It is general information and has not been reviewed by a lawyer."],
  ],
};

G["tamil-nadu-property-terms-patta-chitta-dtcp-cmda-rera"] = {
  answer: "Tamil Nadu property chats mix English and Tamil and use local terms: patta and chitta (land records), EC (encumbrance certificate), DTCP and CMDA (planning authorities), TNRERA (the real-estate regulator), cent and ground (units of land), and lakh and crore (amounts). This glossary explains each one in plain language.",
  body: `
    <p class="note">Plain-language explanations for buyers and for people building tools for them. They are not legal advice. Check official sources for any property you are buying.</p>
    <h2>Land records and documents</h2>
    <dl class="gloss">
      <dt>Patta</dt><dd>A revenue record from the Tamil Nadu revenue department that shows who is recorded as holding a piece of land, used for land tax. A clear patta in the seller's name is one of the first things buyers ask about.</dd>
      <dt>Chitta</dt><dd>An extract from village land records that shows details such as the survey number, extent, land type and the recorded holder. Buyers often ask to see the patta and chitta together.</dd>
      <dt>EC (Encumbrance Certificate)</dt><dd>A certificate from the Registration department listing registered transactions and charges on a property over a period. Buyers use it to check for registered mortgages or earlier sales.</dd>
      <dt>FMB (Field Measurement Book) sketch</dt><dd>A survey sketch of a land parcel showing its boundaries and measurements.</dd>
      <dt>Guideline value</dt><dd>The government's minimum value used to calculate stamp duty and registration charges. It can differ from the market price.</dd>
    </dl>
    <h2>Approvals and regulators</h2>
    <dl class="gloss">
      <dt>DTCP</dt><dd>The Directorate of Town and Country Planning, Tamil Nadu. In practice, buyers ask whether a layout is "DTCP approved" outside the Chennai Metropolitan Area.</dd>
      <dt>CMDA</dt><dd>The Chennai Metropolitan Development Authority, which handles planning permission within the Chennai Metropolitan Area. Chennai buyers ask whether a project is "CMDA approved".</dd>
      <dt>TNRERA</dt><dd>The Tamil Nadu Real Estate Regulatory Authority. Under the RERA rules, projects with more than 500 square metres of land or more than eight apartments, counting all phases, must be registered before sale, and registered projects have a RERA registration number. You can check registered projects on <a href="https://rera.tn.gov.in" target="_blank" rel="noopener">rera.tn.gov.in</a>.</dd>
    </dl>
    <h2>Units and amounts</h2>
    <dl class="gloss">
      <dt>Cent</dt><dd>A unit of land area. 1 cent is about 435.6 square feet. 100 cents make 1 acre.</dd>
      <dt>Ground</dt><dd>A unit of land area used especially in Chennai. 1 ground is 2,400 square feet.</dd>
      <dt>Square foot (sq ft)</dt><dd>The usual unit for built-up area and, increasingly, for plots.</dd>
      <dt>Lakh</dt><dd>100,000. A budget of "40 lakh" is ₹40,00,000.</dd>
      <dt>Crore</dt><dd>10,000,000 (100 lakh). A budget of "1.2 crore" is ₹1,20,00,000.</dd>
    </dl>
    <h2>Language</h2>
    <dl class="gloss">
      <dt>Tanglish</dt><dd>Tamil typed in English letters, often mixed with English words, for example "3 cent plot Coimbatore la irukka?". Many property enquiries on WhatsApp arrive this way.</dd>
    </dl>
    <h2>How the assistant uses these terms</h2>
    <p>The Royce Labs assistant recognises these terms in buyer messages so it can capture a requirement correctly. It does not verify any approval, patta or RERA number itself; it shows only the listing details you give it.</p>
    <h2>Related</h2>
    <ul class="bul">
      <li><a href="/cities/coimbatore/">Coimbatore</a> · <a href="/cities/chennai/">Chennai</a></li>
      <li><a href="/guides/whatsapp-lead-management-real-estate-india/">WhatsApp lead management for real estate in India</a></li>
    </ul>`,
  faq: [
    ["What is the difference between patta and chitta?", "Patta is the revenue record of who holds the land, used for land tax. Chitta is an extract from village records with details such as survey number, extent and land type. Buyers often ask for both."],
    ["How big is a cent and a ground?", "1 cent is about 435.6 square feet, and 100 cents make an acre. 1 ground is 2,400 square feet and is used especially in Chennai."],
    ["Which projects need TNRERA registration?", "Projects with more than 500 square metres of land or more than eight apartments, counting all phases, must be registered before sale. Check registered projects on rera.tn.gov.in."],
  ],
};

function guidePage(g) {
  const gd = GUIDES.find((x) => x === g);
  const body = G[gd.slug];
  const p = `/guides/${gd.slug}/`;
  const items = [{ name: "Home", path: "/" }, { name: "Guides", path: "/guides/" }, { name: gd.short, path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      { "@type": "Article", "@id": SITE + p + "#article", headline: gd.title, description: gd.desc, inLanguage: "en-IN", datePublished: DATE, dateModified: DATE, mainEntityOfPage: SITE + p, image: SITE + "/og-image.png", author: { "@id": SITE + "/#organization" }, publisher: { "@id": SITE + "/#organization" } },
      { "@type": "WebPage", "@id": SITE + p + "#webpage", url: SITE + p, name: gd.title, inLanguage: "en-IN", dateModified: DATE, breadcrumb: { "@id": SITE + p + "#breadcrumb" } },
      { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" },
      { ...faqLd(body.faq), "@id": SITE + p + "#faq" },
    ],
  };
  return (
    head({ title: gd.seo, desc: gd.desc, path: p, ogType: "article", jsonld }) +
    `<article class="section">
  <div class="container container--narrow prose">
    ${crumbs(items)}
    <span class="eyebrow">Guide</span>
    <h1>${esc(gd.title)}</h1>
    <p class="meta">By Royce Labs · Last updated <time datetime="${DATE}">${DATE_LONG}</time></p>
    <p class="answer"><strong>Short answer:</strong> ${esc(body.answer)}</p>
${body.body}
    <h2>FAQ</h2>
    ${faqHtml(body.faq)}
  </div>
</article>

<section class="cta">
  <div class="container">
    <span class="eyebrow">Pilot places · Coimbatore</span>
    <h2>Want this running on your WhatsApp?</h2>
    <p>Fill a 20-second form with your name, email and city. We reply by email with a plain plan.</p>
    <div class="cta__actions"><a class="btn btn--light btn--lg" href="${applyHref("Coimbatore")}">Apply for a pilot place</a></div>
  </div>
</section>
` +
    footer()
  );
}

// ---------- apply form + privacy ----------
function applyPage() {
  const p = "/apply/";
  const title = "Apply for a Pilot Place | Royce Labs";
  const desc = "Apply for a Royce Labs pilot place in 20 seconds: name, business, email and city. We reply by email with a plain plan.";
  const items = [{ name: "Home", path: "/" }, { name: "Apply", path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      { "@type": "ContactPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "en-IN", dateModified: DATE, breadcrumb: { "@id": SITE + p + "#breadcrumb" } },
      { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" },
    ],
  };
  const opt = (arr, ph) => `<option value="">${ph}</option>` + arr.map((c) => `<option>${c}</option>`).join("");
  return (
    head({ title, desc, path: p, jsonld, extra: `<link rel="alternate" hreflang="en-IN" href="${SITE}/apply/" />\n<link rel="alternate" hreflang="ta-IN" href="${SITE}/ta/apply/" />\n` }) +
    `<section class="section">
  <div class="container container--narrow">
    ${crumbs(items)}
    <span class="eyebrow">Pilot places · Coimbatore</span>
    <h1 class="apply__h1">Apply for a pilot place</h1>
    <p class="lede">Four quick questions. We reply by email with a plain plan, usually within one to two working days. No payment to apply.</p>

    <div id="applyStatus" class="notice" role="status" aria-live="polite" hidden></div>

    <form id="applyForm" class="apply" method="post" action="/api/apply" novalidate>
      <input type="hidden" name="source" id="fSource" value="apply" />
      <input type="hidden" name="lang" value="en" />
      <div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>

      <div class="field">
        <label for="fName">Your name</label>
        <input id="fName" name="name" type="text" autocomplete="name" required maxlength="120" />
        <p class="err" id="eName" hidden></p>
      </div>
      <div class="field">
        <label for="fBusiness">Business or company name</label>
        <input id="fBusiness" name="business" type="text" autocomplete="organization" required maxlength="160" />
        <p class="err" id="eBusiness" hidden></p>
      </div>
      <div class="field">
        <label for="fEmail">Email address <span class="hint">(we will reply here)</span></label>
        <input id="fEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@company.com" required maxlength="120" />
        <p class="err" id="eEmail" hidden></p>
      </div>
      <div class="field">
        <label for="fCity">City</label>
        <select id="fCity" name="city" required>${opt(["Coimbatore", "Chennai", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Other Tamil Nadu city", "Outside Tamil Nadu"], "Choose your city")}</select>
        <p class="err" id="eCity" hidden></p>
      </div>
      <div class="field">
        <label for="fPhone">Mobile number <span class="hint">(optional, only if you prefer a call or WhatsApp)</span></label>
        <input id="fPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="98765 43210" maxlength="20" />
        <p class="err" id="ePhone" hidden></p>
      </div>
      <div class="field">
        <label for="fVolume">About how many enquiries a week? <span class="hint">(optional)</span></label>
        <select id="fVolume" name="volume">${opt(["Under 20", "20 to 50", "50 to 100", "More than 100"], "Not sure / skip")}</select>
      </div>
      <div class="field">
        <label for="fNote">Anything we should know? <span class="hint">(optional)</span></label>
        <textarea id="fNote" name="note" rows="3" maxlength="600" placeholder="For example: plots near Saravanampatti, enquiries come from Facebook ads"></textarea>
      </div>
      <div class="field field--check">
        <label class="check"><input type="checkbox" name="consent" value="yes" id="fConsent" required /><span>I agree that Royce Labs may contact me by email, and by phone or WhatsApp if I gave a number, about the pilot. I can say STOP at any time. See the <a href="/privacy/" target="_blank" rel="noopener">privacy notice</a>.</span></label>
        <p class="err" id="eConsent" hidden></p>
      </div>
      <button class="btn btn--primary btn--lg apply__submit" type="submit" id="applyBtn">Send my application</button>
      <p class="fine">We only use these details to contact you about the pilot. We do not sell or share them. Applying does not commit you to anything.</p>
    </form>

    <div id="applyDone" class="done" hidden tabindex="-1">
      <h2>Thank you. We have your application.</h2>
      <p>We will reply to your email within one to two working days. If you do not hear from us, write to <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
      <p><a class="btn btn--ghost" href="/">Back to the homepage</a></p>
    </div>

    <div id="applyFail" class="notice notice--bad" hidden>
      <strong>Sorry, that did not send.</strong> Nothing is lost on your side. Please tap the button to send the same details by email instead.
      <p><a class="btn btn--primary" id="applyMail" href="mailto:${EMAIL}">Send by email</a></p>
    </div>
  </div>
</section>
` +
    footer({ script: "/apply.js" })
  );
}

function applyPageTa() {
  const p = "/ta/apply/";
  const title = "பைலட் இடத்துக்கு விண்ணப்பிக்கவும் | Royce Labs";
  const desc = "Royce Labs பைலட் இடத்துக்கு 20 வினாடியில் விண்ணப்பிக்கவும்: பெயர், நிறுவனம், மின்னஞ்சல், நகரம். மின்னஞ்சலில் பதிலளிப்போம்.";
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [ORG, { "@type": "ContactPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "ta-IN", dateModified: DATE }],
  };
  const extra = `<link rel="alternate" hreflang="ta-IN" href="${SITE}/ta/apply/" />\n<link rel="alternate" hreflang="en-IN" href="${SITE}/apply/" />\n`;
  const opt = (arr, ph) => `<option value="">${ph}</option>` + arr.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  const cities = [["Coimbatore", "கோயம்புத்தூர்"], ["Chennai", "சென்னை"], ["Madurai", "மதுரை"], ["Tiruchirappalli", "திருச்சிராப்பள்ளி"], ["Salem", "சேலம்"], ["Tiruppur", "திருப்பூர்"], ["Other Tamil Nadu city", "தமிழ்நாட்டின் வேறு நகரம்"], ["Outside Tamil Nadu", "தமிழ்நாட்டுக்கு வெளியே"]];
  const vols = [["Under 20", "20-க்கும் குறைவு"], ["20 to 50", "20 முதல் 50"], ["50 to 100", "50 முதல் 100"], ["More than 100", "100-க்கு மேல்"]];
  return (
    head({ title, desc, path: p, jsonld, lang: "ta-IN", extra }) +
    `<section class="section">
  <div class="container container--narrow">
    <span class="eyebrow">பைலட் இடங்கள் · கோவை</span>
    <h1 class="apply__h1">பைலட் இடத்துக்கு விண்ணப்பிக்கவும்</h1>
    <p class="lede">நான்கு சுருக்கமான கேள்விகள். மின்னஞ்சலில் தெளிவான திட்டத்துடன் பதிலளிப்போம், பொதுவாக ஒன்று முதல் இரண்டு வேலை நாட்களுக்குள். விண்ணப்பிக்கக் கட்டணம் இல்லை.</p>

    <div id="applyStatus" class="notice" role="status" aria-live="polite" hidden></div>

    <form id="applyForm" class="apply" method="post" action="/api/apply" novalidate>
      <input type="hidden" name="source" id="fSource" value="apply-ta" />
      <input type="hidden" name="lang" value="ta" />
      <div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>

      <div class="field">
        <label for="fName">உங்கள் பெயர்</label>
        <input id="fName" name="name" type="text" autocomplete="name" required maxlength="120" />
        <p class="err" id="eName" hidden></p>
      </div>
      <div class="field">
        <label for="fBusiness">நிறுவனம் அல்லது தொழிலின் பெயர்</label>
        <input id="fBusiness" name="business" type="text" autocomplete="organization" required maxlength="160" />
        <p class="err" id="eBusiness" hidden></p>
      </div>
      <div class="field">
        <label for="fEmail">மின்னஞ்சல் முகவரி <span class="hint">(இதற்குப் பதிலளிப்போம்)</span></label>
        <input id="fEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@company.com" required maxlength="120" />
        <p class="err" id="eEmail" hidden></p>
      </div>
      <div class="field">
        <label for="fCity">நகரம்</label>
        <select id="fCity" name="city" required>${opt(cities, "உங்கள் நகரத்தைத் தேர்ந்தெடுக்கவும்")}</select>
        <p class="err" id="eCity" hidden></p>
      </div>
      <div class="field">
        <label for="fPhone">மொபைல் எண் <span class="hint">(விருப்பம்; அழைப்பு அல்லது WhatsApp விரும்பினால் மட்டும்)</span></label>
        <input id="fPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="98765 43210" maxlength="20" />
        <p class="err" id="ePhone" hidden></p>
      </div>
      <div class="field">
        <label for="fVolume">வாரத்துக்கு எத்தனை விசாரணைகள்? <span class="hint">(விருப்பம்)</span></label>
        <select id="fVolume" name="volume">${opt(vols, "தெரியவில்லை / தவிர்")}</select>
      </div>
      <div class="field">
        <label for="fNote">நாங்கள் தெரிந்துகொள்ள வேண்டியது ஏதேனும்? <span class="hint">(விருப்பம்)</span></label>
        <textarea id="fNote" name="note" rows="3" maxlength="600" placeholder="எ.கா: சரவணம்பட்டி அருகே மனைகள், விசாரணைகள் Facebook விளம்பரங்களிலிருந்து வருகின்றன"></textarea>
      </div>
      <div class="field field--check">
        <label class="check"><input type="checkbox" name="consent" value="yes" id="fConsent" required /><span>பைலட் பற்றி Royce Labs என்னை மின்னஞ்சலில் தொடர்புகொள்ளலாம் என்றும், நான் எண் கொடுத்திருந்தால் தொலைபேசி அல்லது WhatsApp-இலும் தொடர்புகொள்ளலாம் என்றும் ஒப்புக்கொள்கிறேன். எப்போது வேண்டுமானாலும் STOP என்று சொல்லலாம். <a href="/privacy/" target="_blank" rel="noopener">தனியுரிமை அறிவிப்பைப்</a> பார்க்கவும் (ஆங்கிலத்தில்).</span></label>
        <p class="err" id="eConsent" hidden></p>
      </div>
      <button class="btn btn--primary btn--lg apply__submit" type="submit" id="applyBtn">என் விண்ணப்பத்தை அனுப்பு</button>
      <p class="fine">இந்த விவரங்களை பைலட் பற்றித் தொடர்புகொள்ள மட்டுமே பயன்படுத்துவோம். விற்கவோ பகிரவோ மாட்டோம். விண்ணப்பிப்பதால் எந்தக் கடப்பாடும் இல்லை.</p>
    </form>

    <div id="applyDone" class="done" hidden tabindex="-1">
      <h2>நன்றி. உங்கள் விண்ணப்பம் கிடைத்தது.</h2>
      <p>ஒன்று முதல் இரண்டு வேலை நாட்களுக்குள் உங்கள் மின்னஞ்சலுக்குப் பதிலளிப்போம். பதில் வரவில்லை என்றால் <a href="mailto:${EMAIL}">${EMAIL}</a> என்ற முகவரிக்கு எழுதுங்கள்.</p>
      <p><a class="btn btn--ghost" href="/ta/">முகப்புக்குத் திரும்பு</a></p>
    </div>

    <div id="applyFail" class="notice notice--bad" hidden>
      <strong>மன்னிக்கவும், அனுப்ப முடியவில்லை.</strong> உங்கள் தகவல் இழக்கப்படவில்லை. அதே விவரங்களை மின்னஞ்சலில் அனுப்ப கீழே உள்ள பொத்தானைத் தட்டவும்.
      <p><a class="btn btn--primary" id="applyMail" href="mailto:${EMAIL}">மின்னஞ்சலில் அனுப்பு</a></p>
    </div>
  </div>
</section>
` +
    footer({ script: "/apply.js" })
  );
}
function privacyPage() {
  const p = "/privacy/";
  const title = "Privacy Notice | Royce Labs";
  const desc = "What Royce Labs collects when you apply for a pilot place, why, how long we keep it, and how to ask us to delete it.";
  const items = [{ name: "Home", path: "/" }, { name: "Privacy", path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [ORG, { "@type": "WebPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "en-IN", dateModified: DATE }, { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" }],
  };
  return (
    head({ title, desc, path: p, jsonld }) +
    `<section class="section">
  <div class="container container--narrow prose">
    ${crumbs(items)}
    <span class="eyebrow">Privacy</span>
    <h1>Privacy notice</h1>
    <p class="meta">Last updated <time datetime="${DATE}">${DATE_LONG}</time>. This is a plain-language notice written by Royce Labs. It has not been reviewed by a lawyer.</p>
    <h2>Who we are</h2>
    <p>Royce Labs AI Solutions, Coimbatore, Tamil Nadu. Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
    <h2>What we collect when you apply for a pilot place</h2>
    <ul class="bul">
      <li>Your name, business name, email address and city, and a mobile number only if you choose to give one.</li>
      <li>Optionally: how many enquiries you get a week, and a short note.</li>
      <li>The page you applied from, the language of the form, and the country your request came from (a coarse location from Cloudflare). We do not store your IP address.</li>
    </ul>
    <h2>Why we collect it</h2>
    <p>Only to contact you about the pilot, by email (and by phone or WhatsApp only if you gave a number), and to reply to your application. We ask you to tick a box before we use your number.</p>
    <h2>Who sees it</h2>
    <p>The Royce Labs team. The application is sent by email using Resend, an email delivery provider, and the website is served by Cloudflare. We do not sell your details or use them for advertising.</p>
    <h2>How long we keep it</h2>
    <p>For as long as we are in touch with you about the pilot, and up to 12 months after the last contact if you do not join. After that we delete it.</p>
    <h2>Your choices</h2>
    <p>Say STOP on any call or WhatsApp message, or email us, and we will stop contacting you. You can also ask what we hold about you, ask us to correct it, or ask us to delete it. We will reply within 30 days.</p>
    <h2>Buyers who message our customers on WhatsApp</h2>
    <p>The sections above are about this website. When a buyer chats with a developer's WhatsApp assistant, the developer decides why the buyer's details are collected, and we handle them only on the developer's behalf.</p>
    <ul class="bul">
      <li><b>What is collected:</b> only what the buyer chooses to share in the chat, such as name, budget, preferred location, plot size and a site-visit request. The assistant asks for consent before saving anything and says it is automated.</li>
      <li><b>Who sees it:</b> the developer or agency whose number the buyer wrote to. Each customer's data is kept separate; one customer's chats are never shown to another, and we do not use chat data to train AI models.</li>
      <li><b>Opting out:</b> the buyer can say STOP or no at any time. The assistant stops and treats consent as withdrawn. A buyer can also ask the developer, or write to <a href="mailto:${EMAIL}">${EMAIL}</a>, to see, correct or delete their details.</li>
      <li><b>A person:</b> buyers can ask for a person at any time, and a person confirms every site visit.</li>
    </ul>
    <p>See also <a href="/guides/dpdp-consent-whatsapp-real-estate-leads/">our DPDP consent guide</a> and our <a href="/terms/">terms</a>.</p>
    <h2>Cookies</h2>
    <p>This website does not set advertising cookies. Cloudflare may use strictly necessary cookies for security and performance.</p>
  </div>
</section>
` +
    footer()
  );
}
function termsPage() {
  const p = "/terms/";
  const title = "Terms of Service | Royce Labs";
  const desc = "Plain-language terms for the Royce Labs real-estate enquiry service on WhatsApp: what the pilot is, how fees work, who owns the WhatsApp number and the leads, and how to reach a person.";
  const items = [{ name: "Home", path: "/" }, { name: "Terms", path: p }];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [ORG, { "@type": "WebPage", "@id": SITE + p + "#webpage", url: SITE + p, name: title, inLanguage: "en-IN", dateModified: DATE }, { ...crumbLd(items), "@id": SITE + p + "#breadcrumb" }],
  };
  return (
    head({ title, desc, path: p, jsonld }) +
    `<section class="section">
  <div class="container container--narrow prose">
    ${crumbs(items)}
    <span class="eyebrow">Terms</span>
    <h1>Terms of service</h1>
    <p class="meta">Last updated <time datetime="${DATE}">${DATE_LONG}</time>. This is a plain-language summary written by Royce Labs. It has not been reviewed by a lawyer, and the written agreement we sign with each customer takes priority over it.</p>
    <h2>Who we are</h2>
    <p>Royce Labs AI Solutions, Coimbatore, Tamil Nadu. Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
    <h2>What the service is</h2>
    <p>We run a real-estate enquiry service for developers and agencies. When a buyer messages your WhatsApp Business number, an automated AI assistant replies in English or Tamil, asks for consent, records the buyer's requirement, shows matching listings that you provided, and passes site-visit requests to your team. Buyers are told they are talking to an automated assistant.</p>
    <h2>What it does not do</h2>
    <ul class="bul">
      <li>It does not quote prices, book visits on its own, or take money, bank details or ID documents.</li>
      <li>It only uses the listings and approval details you give it. You are responsible for their accuracy.</li>
      <li>It does not message people who have not contacted you first. Old-lead follow-up and phone calls are planned, not live, and will not start until the consent and telecom rules have been checked by a lawyer.</li>
    </ul>
    <h2>The pilot and fees</h2>
    <p>Applying is free. The first step is a small 30-day paid pilot in Coimbatore. We agree the fee with you by email, in writing, before anything starts. Nothing is charged until you agree. After the pilot you can stop, or move to a monthly plan plus a one-time setup fee, again agreed in writing first. Fees may change as we learn from the first customers, but never for a period you have already agreed.</p>
    <p>The product is built and tested offline. Live use with real buyers has not yet been proven, and the pilot is its first live run. We will tell you plainly what has and has not worked.</p>
    <h2>Your WhatsApp number and your leads</h2>
    <ul class="bul">
      <li>The WhatsApp Business account and phone number are yours, registered to your business under your own Meta business account. We do not resell WhatsApp access.</li>
      <li>The leads and buyer conversations belong to you. We handle them only on your behalf, keep each customer's data separate, and do not share one customer's chats or leads with another.</li>
      <li>We do not use your buyers' data to train AI models.</li>
    </ul>
    <h2>A person is always reachable</h2>
    <p>The assistant is not a replacement for your team. Buyers can ask for a person at any time, and your team confirms every site visit. Our own contact for customers is <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
    <h2>Consent and opting out</h2>
    <p>The assistant asks for consent before saving anything. A buyer can say STOP or no at any time and the assistant stops and treats consent as withdrawn. See our <a href="/privacy/">privacy notice</a> and the <a href="/guides/dpdp-consent-whatsapp-real-estate-leads/">DPDP consent guide</a>.</p>
    <h2>What we need from you</h2>
    <ul class="bul">
      <li>Use the service only for lawful real-estate enquiries, and follow <a href="https://business.whatsapp.com/policy" target="_blank" rel="noopener">WhatsApp's Business Messaging Policy</a>.</li>
      <li>Give accurate listings and approvals, and keep them up to date.</li>
      <li>Do not use it to discriminate against buyers or to mislead them.</li>
    </ul>
    <h2>Stopping</h2>
    <p>You can cancel after the 30-day pilot with no lock-in, or earlier by emailing us. We can stop the service if WhatsApp or Meta restricts the account, if the rules above are broken, or if a law requires it.</p>
    <h2>No guarantees</h2>
    <p>We do not promise a number of leads or sales. WhatsApp, Meta and other providers can change their rules or have outages that we do not control.</p>
  </div>
</section>
` +
    footer()
  );
}function thanksPage() {
  const p = "/apply/thanks/";
  const title = "Thank you | Royce Labs";
  const jsonld = { "@context": "https://schema.org", "@graph": [ORG] };
  return (
    head({ title, desc: "Thank you for applying. We will reply by email within one to two working days.", path: p, jsonld, robots: "noindex, follow" }) +
    `<section class="section">
  <div class="container container--narrow">
    <div class="done">
      <h1 class="apply__h1" style="color:#fff">Thank you. We have your application.</h1>
      <p>We will reply to your email within one to two working days. If you do not hear from us, write to <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
      <p><a class="btn btn--ghost" href="/">Back to the homepage</a></p>
    </div>
  </div>
</section>
` +
    footer()
  );
}
// ---------- run ----------
CITIES.forEach((c) => write(`cities/${c.slug}`, cityPage(c)));
write("cities", citiesIndex());
write("guides", guidesIndex());
write("apply", applyPage());
write("privacy", privacyPage());
write("terms", termsPage());
write("apply/thanks", thanksPage());
write("ta/apply", applyPageTa());
GUIDES.forEach((g) => write(`guides/${g.slug}`, guidePage(g)));

// sitemap (home + ta carry hreflang alternates)
const urls = [
  { loc: "/", alt: true, pri: "1.0" },
  { loc: "/ta/", alt: true, pri: "0.8" },
  { loc: "/cities/", pri: "0.7" },
  ...CITIES.map((c) => ({ loc: `/cities/${c.slug}/`, pri: c.pilot ? "0.9" : "0.7" })),
  { loc: "/guides/", pri: "0.7" },
  { loc: "/apply/", pri: "0.6" },
  { loc: "/ta/apply/", pri: "0.5" },
  { loc: "/privacy/", pri: "0.3" },
  { loc: "/terms/", pri: "0.3" },
  ...GUIDES.map((g) => ({ loc: `/guides/${g.slug}/`, pri: "0.7" })),
];
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${DATE}</lastmod>
${u.alt ? `    <xhtml:link rel="alternate" hreflang="en-IN" href="${SITE}/" />\n    <xhtml:link rel="alternate" hreflang="ta-IN" href="${SITE}/ta/" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />\n` : ""}    <priority>${u.pri}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sm, "utf8");
console.log("wrote sitemap.xml with", urls.length, "urls");
