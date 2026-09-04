// YouTube Data API v3 - free (10,000 quota units/day), no OAuth needed for
// public channel lookups. Get a key at console.cloud.google.com (enable
// "YouTube Data API v3", create an API key, no billing account required for
// this quota tier).

import type { Env } from "../types";

export interface YoutubeFindings {
  found: boolean;
  channelTitle?: string;
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
  description?: string;
  error?: string;
}

// Accepts a handle (@name), a full channel URL, or a bare channel name and
// extracts the identifier YouTube's API can search on.
function extractHandleOrQuery(input: string): { handle?: string; query: string } {
  const trimmed = input.trim();
  const handleMatch = trimmed.match(/(?:youtube\.com\/)?@([\w.-]+)/i);
  if (handleMatch) return { handle: handleMatch[1], query: handleMatch[1] };

  const channelIdMatch = trimmed.match(/youtube\.com\/channel\/([\w-]+)/i);
  if (channelIdMatch) return { query: channelIdMatch[1] };

  // Bare name/handle without a URL, e.g. "yourbrand" or "@yourbrand"
  const bare = trimmed.replace(/^@/, "").replace(/^https?:\/\/(www\.)?youtube\.com\//i, "");
  return { handle: bare, query: bare };
}

export async function lookupYoutubeChannel(
  env: Env,
  youtubeInput: string
): Promise<YoutubeFindings> {
  if (!env.YOUTUBE_API_KEY) {
    return { found: false, error: "YOUTUBE_API_KEY not configured" };
  }
  if (!youtubeInput) return { found: false };

  const { handle, query } = extractHandleOrQuery(youtubeInput);

  try {
    // Try the direct handle lookup first (forHandle) - cheaper and more
    // precise than search.list when we have a real @handle.
    if (handle) {
      const url = new URL("https://www.googleapis.com/youtube/v3/channels");
      url.searchParams.set("part", "snippet,statistics");
      url.searchParams.set("forHandle", handle.startsWith("@") ? handle : `@${handle}`);
      url.searchParams.set("key", env.YOUTUBE_API_KEY);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = (await res.json()) as { items?: any[] };
        if (data.items && data.items.length > 0) {
          const ch = data.items[0];
          return {
            found: true,
            channelTitle: ch.snippet?.title,
            subscriberCount: ch.statistics?.subscriberCount,
            videoCount: ch.statistics?.videoCount,
            viewCount: ch.statistics?.viewCount,
            description: (ch.snippet?.description || "").slice(0, 300),
          };
        }
      }
    }

    // Fall back to search.list (costs more quota, 100 units, but handles
    // free-text company names when no clean handle was extracted).
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "channel");
    searchUrl.searchParams.set("maxResults", "1");
    searchUrl.searchParams.set("key", env.YOUTUBE_API_KEY);

    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
      return { found: false, error: `YouTube search HTTP ${searchRes.status}` };
    }
    const searchData = (await searchRes.json()) as { items?: any[] };
    const channelId = searchData.items?.[0]?.snippet?.channelId || searchData.items?.[0]?.id?.channelId;
    if (!channelId) return { found: false };

    const detailUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    detailUrl.searchParams.set("part", "snippet,statistics");
    detailUrl.searchParams.set("id", channelId);
    detailUrl.searchParams.set("key", env.YOUTUBE_API_KEY);

    const detailRes = await fetch(detailUrl.toString());
    if (!detailRes.ok) return { found: false, error: `YouTube channels HTTP ${detailRes.status}` };
    const detailData = (await detailRes.json()) as { items?: any[] };
    const ch = detailData.items?.[0];
    if (!ch) return { found: false };

    return {
      found: true,
      channelTitle: ch.snippet?.title,
      subscriberCount: ch.statistics?.subscriberCount,
      videoCount: ch.statistics?.videoCount,
      viewCount: ch.statistics?.viewCount,
      description: (ch.snippet?.description || "").slice(0, 300),
    };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}

export function formatYoutubeFindings(f: YoutubeFindings): string {
  if (f.error) return `YouTube lookup failed: ${f.error}`;
  if (!f.found) return "not found";
  return `Channel: ${f.channelTitle} | Subscribers: ${f.subscriberCount ?? "hidden"} | Videos: ${
    f.videoCount ?? "unknown"
  } | Total views: ${f.viewCount ?? "unknown"}${f.description ? ` | About: ${f.description}` : ""}`;
}
