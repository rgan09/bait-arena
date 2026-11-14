import { ApiError, GoogleGenAI } from "@google/genai";

// Flash-Lite has the most generous free tier. Override with GEMINI_MODEL in Vercel if needed.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  client = new GoogleGenAI({ apiKey });
  return client;
}

export class BlockedBySafety extends Error {}

/**
 * One JSON-mode call to Gemini with a hard timeout and a single retry on rate-limit/overload.
 * Throws BlockedBySafety if Google's own safety filter refused the content.
 */
export async function generateJson<T>(opts: {
  system: string;
  user: string;
  schema: object;
  timeoutMs?: number;
  temperature?: number;
}): Promise<T> {
  const deadline = Date.now() + (opts.timeoutMs ?? 12_000);

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 1500) break;
    try {
      const res = await gemini().models.generateContent({
        model: MODEL,
        contents: opts.user,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: opts.schema,
          temperature: opts.temperature ?? 1,
          maxOutputTokens: 600,
          abortSignal: AbortSignal.timeout(remaining),
        },
      });
      if (res.promptFeedback?.blockReason) throw new BlockedBySafety(String(res.promptFeedback.blockReason));
      if (res.candidates?.[0]?.finishReason === "SAFETY") throw new BlockedBySafety("SAFETY");
      const text = res.text;
      if (!text) throw new Error("Empty response from Gemini");
      return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as T;
    } catch (err) {
      if (err instanceof BlockedBySafety) throw err;
      const retryable = err instanceof ApiError && (err.status === 429 || err.status >= 500);
      if (!retryable || attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error("Gemini timed out");
}
