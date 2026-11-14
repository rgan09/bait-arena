// Gateway helpers shared by every /api/v1 route: errors, validation, auth, rate limiting.
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const ok = <T,>(data: T, status = 200) => NextResponse.json(data, { status });

/** Wraps a route handler so thrown HttpErrors become clean JSON errors: { error: { code, message } } */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      console.error("[api] unexpected error:", err);
      return NextResponse.json(
        { error: { code: "internal", message: "Something broke on our side. Try again." } },
        { status: 500 },
      );
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "bad_json", "Request body must be JSON.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid request.";
    throw new HttpError(400, "invalid", msg);
  }
  return parsed.data;
}

/** Player identity: `Authorization: Bearer <token>` issued on create/join. */
export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

export function roomCode(raw: string): string {
  const code = raw.toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) throw new HttpError(400, "bad_code", "Room codes are 4 letters.");
  return code;
}

// Simple in-memory limiter (per server instance): enough to stop button-mashing and loops.
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimit(req: Request, bucket: string, max = 20, windowMs = 10_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++entry.count > max) throw new HttpError(429, "slow_down", "Slow down! Too many requests.");
}
