// Minimal HTTP Basic Auth for admin-only routes (/leads, /leads/:id, and any
// future internal dashboards). Single shared password, not per-user accounts
// - deliberately simple since this is a small team, not a multi-user product
// yet. Set via `wrangler secret put ADMIN_PASSWORD`.

import type { Env } from "../types";

export function isAuthorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_PASSWORD) {
    // Fail closed: if no password is configured, deny access rather than
    // leaving the dashboard silently open to anyone who finds the URL.
    return false;
  }

  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const colonIndex = decoded.indexOf(":");
    const password = colonIndex === -1 ? decoded : decoded.slice(colonIndex + 1);
    return password === env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export function requireAuthResponse(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="leadqual-worker admin"' },
  });
}
