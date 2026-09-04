// Port of IG-Trigger.json: Meta webhook GET verification + IG DM parsing +
// send via Graph API. Requires META_VERIFY_TOKEN (webhook subscribe) and
// META_PAGE_ACCESS_TOKEN (send) secrets once you have a Meta app configured.

import type { Env } from "../types";

export interface InstagramMessage {
  external_id: string; // sender's IG-scoped user id
  message_text: string;
  message_id: string;
}

// GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// Meta calls this once when you register the webhook URL in the app dashboard.
export function verifyMetaChallenge(
  env: Env,
  query: URLSearchParams
): { ok: true; challenge: string } | { ok: false } {
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");
  if (mode === "subscribe" && challenge && token === env.META_VERIFY_TOKEN) {
    return { ok: true, challenge };
  }
  return { ok: false };
}

// Parses the Instagram Messaging webhook payload shape:
//   entry[0].messaging[0]
export function extractInstagramMessage(body: any): InstagramMessage | null {
  const entry = body?.entry?.[0];
  const messaging = entry?.messaging?.[0];
  if (!messaging?.message) return null;

  return {
    external_id: messaging.sender.id,
    message_text: messaging.message.text || "",
    message_id: messaging.message.mid,
  };
}

export async function sendInstagramMessage(
  env: Env,
  recipientId: string,
  text: string
): Promise<void> {
  if (!env.META_PAGE_ACCESS_TOKEN) {
    console.warn(
      "sendInstagramMessage: META_PAGE_ACCESS_TOKEN not set - message not sent.",
      { recipientId, text }
    );
    return;
  }

  const url = new URL("https://graph.facebook.com/v19.0/me/messages");
  url.searchParams.set("access_token", env.META_PAGE_ACCESS_TOKEN);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    // Matches onError=continueRegularOutput in the source workflow - log, don't throw.
    console.error(`Instagram send failed: HTTP ${res.status} ${await res.text()}`);
  }
}
