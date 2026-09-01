import "server-only";

import { createHash, createHmac } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  unavailable?: boolean;
};

type Bucket = { count: number; resetAt: number };
const developmentBuckets = new Map<string, Bucket>();

class MissingTrustedClientAddressError extends Error {
  constructor() {
    super(
      "Keine vertrauenswürdige Netzwerkherkunft verfügbar. " +
        "Auf Vercel muss VERCEL gesetzt sein; ausserhalb davon muss " +
        "TRUSTED_PROXY_HEADER auf einen vom Reverse Proxy gesetzten Header zeigen.",
    );
    this.name = "MissingTrustedClientAddressError";
  }
}

function trustedAddress(request: Request) {
  if (process.env.VERCEL) {
    const vercelAddress = request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    if (vercelAddress) return vercelAddress;
  }

  const configuredHeader = process.env.TRUSTED_PROXY_HEADER?.trim().toLowerCase();
  if (configuredHeader) {
    const value = request.headers.get(configuredHeader)?.split(",")[0]?.trim();
    if (value) return value;
  }

  throw new MissingTrustedClientAddressError();
}

export function createRateLimitKey(request: Request, scope: string) {
  return createScopedRateLimitKey(scope, trustedAddress(request));
}

function createScopedRateLimitKey(scope: string, identifier: string) {
  const value = `${scope}:${identifier}`;
  const secret = process.env.RATE_LIMIT_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return createHmac("sha256", secret).update(value).digest("hex");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  }
  return createHash("sha256").update(`development:${value}`).digest("hex");
}

function checkDevelopmentBucket(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const current = developmentBuckets.get(key);
  if (!current || current.resetAt <= now) {
    developmentBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  let key: string;
  try {
    key = createRateLimitKey(request, scope);
  } catch (error) {
    if (!(error instanceof MissingTrustedClientAddressError)) throw error;
    console.error("[AlphaQuiz Rate Limit] Anfrage geschlossen abgelehnt", error);
    return { allowed: false, retryAfter: 60, unavailable: true };
  }

  return checkRateLimitKey(
    key,
    scope,
    limit,
    windowMs,
  );
}

export async function checkIdentifierRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return checkRateLimitKey(
    createScopedRateLimitKey(scope, identifier.trim().toLowerCase()),
    scope,
    limit,
    windowMs,
  );
}

async function checkRateLimitKey(
  key: string,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const { client, error: configurationError } = getSupabaseAdmin();
    if (!client) {
      throw new Error(configurationError ?? "Supabase ist nicht konfiguriert.");
    }
    const { data, error } = await client.rpc("consume_rate_limit", {
      p_key_hash: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    if (
      !result ||
      typeof result.allowed !== "boolean" ||
      typeof result.retry_after !== "number"
    ) {
      throw new Error("Ungültige Antwort der Rate-Limit-Funktion.");
    }
    return {
      allowed: result.allowed,
      retryAfter: Math.max(0, Math.ceil(result.retry_after)),
    };
  } catch (error) {
    console.error(
      "[AlphaQuiz Rate Limit] Dauerhafte Drosselung nicht verfügbar",
      error,
    );
    if (process.env.NODE_ENV !== "production") {
      return checkDevelopmentBucket(
        key,
        limit,
        windowMs,
      );
    }
    return { allowed: false, retryAfter: 60, unavailable: true };
  }
}
