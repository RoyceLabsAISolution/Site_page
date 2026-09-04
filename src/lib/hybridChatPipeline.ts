// Orchestrates the hybrid FAQ <-> structured-qualification chat flow for the
// roycelabs.pages.dev widget. Replaces the site's original /api/chat Pages
// Function (source unavailable) with equivalent-or-better behavior:
//   - FAQ mode: free-form Q&A grounded on site content (src/lib/faq.ts)
//   - On detected contact info / buying intent -> flip to qualifying mode
//   - Qualifying mode: same Qualifying-Core slot state machine used by the
//     dedicated /webhook/chat endpoint, so scoring + Slack alerts happen
//     identically regardless of which entry point started the conversation.

import type { Env, Channel } from "../types";
import { getOrCreateChatSession, setChatSessionQualifying } from "./db";
import { answerFaqTurn, type ChatMessage } from "./faq";
import { runQualifyingCore } from "./qualifyingPipeline";
import { runScoringPipeline } from "./scoringPipeline";

export interface HybridChatResult {
  reply: string;
  mode: "faq" | "qualifying";
}

export async function runHybridChat(
  env: Env,
  sessionId: string,
  messages: ChatMessage[],
  onQualifiedComplete: (leadId: number) => void
): Promise<HybridChatResult> {
  const tenantId = "default";
  const session = await getOrCreateChatSession(env, sessionId, tenantId);

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";

  if (session.mode === "qualifying") {
    const result = await runQualifyingCore(
      env,
      { channel: "website" as Channel, external_id: sessionId, message_text: lastUserMessage },
      onQualifiedComplete
    );
    return { reply: result.text, mode: "qualifying" };
  }

  // FAQ mode: let the model answer and judge whether to hand off.
  const faqResult = await answerFaqTurn(env, messages);

  if (!faqResult.wants_handoff) {
    return { reply: faqResult.reply, mode: "faq" };
  }

  // Handoff: flip session to qualifying mode and immediately ask the first
  // structured question, seeding profile_hint from anything the model
  // already detected in the FAQ turn (e.g. an email pasted mid-conversation)
  // so the visitor doesn't have to repeat themselves.
  await setChatSessionQualifying(env, sessionId);

  const seedMessageText = faqResult.detected_email || faqResult.detected_phone || "";
  const result = await runQualifyingCore(
    env,
    { channel: "website" as Channel, external_id: sessionId, message_text: seedMessageText },
    onQualifiedComplete
  );

  // Prepend a short transition acknowledgment so the handoff doesn't feel
  // abrupt to the visitor.
  const transition = "Great, let's get you set up properly — a few quick questions first.";
  return { reply: `${transition} ${result.text}`, mode: "qualifying" };
}
