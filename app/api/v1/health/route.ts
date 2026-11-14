import { connection } from "next/server";
import { MODEL } from "@/server/ai/gemini";
import { ok } from "@/server/http";

/** GET /api/v1/health — quick check that the deployment has its env vars (never reveals values). */
export async function GET() {
  await connection(); // always check at request time, never cache
  return ok({
    ok: true,
    model: MODEL,
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_publishable_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    supabase_secret_key: Boolean(process.env.SUPABASE_SECRET_KEY),
    gemini_api_key: Boolean(process.env.GEMINI_API_KEY),
  });
}
