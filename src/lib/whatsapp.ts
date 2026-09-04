// Port of WA-Trigger.json: WhatsApp Cloud API webhook parsing + message send.
// Requires WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID secrets once you
// have a WhatsApp Business Cloud API account (developers.facebook.com).

import type { Env } from "../types";

export interface WhatsAppMessage {
  external_id: string; // sender's WhatsApp number
  message_text: string;
  message_id: string;
}

// Parses the WhatsApp Cloud API webhook payload shape:
//   entry[0].changes[0].value.messages[0]
export function extractWhatsAppMessage(body: any): WhatsAppMessage | null {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  if (!message) return null;

  return {
    external_id: message.from,
    message_text: message.text?.body || "",
    message_id: message.id,
  };
}

export async function sendWhatsAppMessage(
  env: Env,
  recipientPhoneNumber: string,
  text: string
): Promise<void> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn(
      "sendWhatsAppMessage: WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set - message not sent.",
      { recipientPhoneNumber, text }
    );
    return;
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhoneNumber,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`WhatsApp send failed: HTTP ${res.status} ${await res.text()}`);
  }
}
