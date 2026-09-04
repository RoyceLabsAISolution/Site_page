import type { Env } from "../types";

interface JsonSchema {
  type: string;
  properties: Record<string, unknown>;
  required: string[];
  [k: string]: unknown;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// HTTP statuses that mean "this specific model is gone/unreachable", not
// "transient failure, retry the same model." NVIDIA returns 410 when a
// model is deprecated (as happened to nvidia/llama-3.3-nemotron-super-49b-v1
// on 2026-08-26) and 404 when a model id doesn't exist for the account's
// catalog at all - both should immediately fall through to the next model
// in the list rather than burning retries on a model that will never work.
const MODEL_UNAVAILABLE_STATUSES = new Set([404, 410]);

// Returns the ordered list of models to try: the primary NVIDIA_NIM_MODEL
// first, then any comma-separated fallbacks from NVIDIA_NIM_FALLBACK_MODELS.
// This is the resilience mechanism for NVIDIA deprecating/renaming a model
// out from under us again - swap/add a fallback via `wrangler secret put`
// or a wrangler.toml var change (a redeploy either way, but no code change,
// and automatic failover means a deprecation doesn't even need a human to
// notice before the *next* scoring call self-heals).
function modelCandidates(env: Env): string[] {
  const primary = env.NVIDIA_NIM_MODEL;
  const fallbacks = (env.NVIDIA_NIM_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

// Calls an OpenAI-compatible chat completion endpoint (NVIDIA NIM) and asks
// for strict JSON matching the given schema. Retries on transient failure/
// parse error per model (mirroring the n8n LangChain agent's retryOnFail),
// and falls through to the next candidate model on a "model unavailable"
// response (404/410) so a single deprecated model can't take down scoring.
export async function callNimStructured<T>(
  env: Env,
  systemPrompt: string,
  userText: string,
  schema: JsonSchema,
  opts: { maxTries?: number; waitMs?: number } = {}
): Promise<T> {
  const maxTries = opts.maxTries ?? 5;
  const waitMs = opts.waitMs ?? 3000;

  if (!env.NVIDIA_NIM_API_KEY) {
    throw new Error("NVIDIA_NIM_API_KEY secret is not set (wrangler secret put NVIDIA_NIM_API_KEY)");
  }

  const schemaInstructions = `Respond with ONLY valid JSON matching this exact schema (no markdown fences, no commentary):\n${JSON.stringify(
    schema
  )}`;

  const models = modelCandidates(env);
  let lastErr: unknown;

  for (const model of models) {
    let modelUnavailable = false;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const res = await fetch(`${env.NVIDIA_NIM_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.NVIDIA_NIM_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: `${systemPrompt}\n\n${schemaInstructions}` },
              { role: "user", content: userText },
            ],
            temperature: 0.2,
            max_tokens: 2000,
            // nemotron-3.5-lightning defaults to "reasoning on", which puts a long
            // chain-of-thought in `content` before (or instead of, if truncated)
            // the actual JSON. Disable it so `content` is the clean JSON directly.
            chat_template_kwargs: { thinking: false },
          }),
        });

        if (!res.ok) {
          const bodyText = await res.text();
          if (MODEL_UNAVAILABLE_STATUSES.has(res.status)) {
            console.warn(
              `NIM model '${model}' unavailable (HTTP ${res.status}), trying next fallback: ${bodyText}`
            );
            modelUnavailable = true;
            break; // stop retrying this model, move to the next candidate
          }
          throw new Error(`NIM HTTP ${res.status}: ${bodyText}`);
        }

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("NIM returned no content");

        const jsonStr = extractJson(content);
        const parsed = JSON.parse(jsonStr) as T;
        validateRequired(parsed as Record<string, unknown>, schema.required);
        return parsed;
      } catch (err) {
        lastErr = err;
        if (attempt < maxTries) await sleep(waitMs);
      }
    }

    if (!modelUnavailable && lastErr) {
      // Exhausted retries on this model due to transient errors (not
      // unavailability) - still worth trying the next candidate rather than
      // giving up entirely, but log distinctly from the unavailable case.
      console.warn(`NIM model '${model}' failed after ${maxTries} attempts, trying next fallback.`);
    }
  }

  throw new Error(
    `NIM call failed on all ${models.length} candidate model(s) [${models.join(", ")}]: ${String(lastErr)}`
  );
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  // Strip markdown code fences if the model added them despite instructions.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // Fallback: grab from first { to last }.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function validateRequired(obj: Record<string, unknown>, required: string[]): void {
  for (const key of required) {
    if (!(key in obj) || obj[key] === undefined) {
      throw new Error(`Missing required field '${key}' in model output`);
    }
  }
}
