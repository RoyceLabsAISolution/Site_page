// Instagram Profile Scraper via Apify (apify/instagram-profile-scraper).
// Instagram blocks direct scraping (confirmed: Jina Reader gets HTTP 403),
// and the official Graph API requires the LEAD's account to already be a
// Business account OAuth-connected to our app - unworkable for researching
// prospects who haven't onboarded. Apify is a paid-but-cheap ($2.60/1,000
// lookups, $5 free credit ≈ 1,900 free lookups) legitimate alternative that
// only reads public profile data.

import type { Env } from "../types";

export interface InstagramFindings {
  found: boolean;
  fullName?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  biography?: string;
  isVerified?: boolean;
  isBusinessAccount?: boolean;
  externalUrl?: string;
  error?: string;
}

function extractUsername(input: string): string {
  const trimmed = input.trim().replace(/^@/, "");
  const urlMatch = trimmed.match(/instagram\.com\/([\w.]+)/i);
  return (urlMatch ? urlMatch[1] : trimmed).replace(/\/$/, "");
}

// Apify's "run Actor synchronously and get dataset items" endpoint - one
// HTTP call, no polling needed for a single-profile lookup.
export async function lookupInstagramProfile(
  env: Env,
  instagramInput: string
): Promise<InstagramFindings> {
  if (!env.APIFY_API_TOKEN) {
    return { found: false, error: "APIFY_API_TOKEN not configured" };
  }
  const username = extractUsername(instagramInput);
  if (!username) return { found: false };

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username] }),
      }
    );

    if (!res.ok) {
      return { found: false, error: `Apify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }

    const items = (await res.json()) as any[];
    const profile = items?.[0];
    if (!profile || profile.error) {
      return { found: false, error: profile?.error || "profile not found" };
    }

    return {
      found: true,
      fullName: profile.fullName,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount,
      biography: (profile.biography || "").slice(0, 300),
      isVerified: profile.verified,
      isBusinessAccount: profile.isBusinessAccount,
      externalUrl: profile.externalUrl,
    };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}

export function formatInstagramFindings(f: InstagramFindings): string {
  if (f.error) return `Instagram lookup failed: ${f.error}`;
  if (!f.found) return "not found";
  return `${f.fullName || ""} | Followers: ${f.followersCount ?? "unknown"} | Following: ${
    f.followsCount ?? "unknown"
  } | Posts: ${f.postsCount ?? "unknown"} | Verified: ${f.isVerified ? "yes" : "no"} | Business account: ${
    f.isBusinessAccount ? "yes" : "no"
  }${f.biography ? ` | Bio: ${f.biography}` : ""}`;
}
