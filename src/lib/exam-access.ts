import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createAttemptAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAttemptAccessToken(token) };
}

export function hashAttemptAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isAttemptAccessTokenValid(token: string, storedHash: string) {
  const candidate = Buffer.from(hashAttemptAccessToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return (
    candidate.length === stored.length &&
    timingSafeEqual(candidate, stored)
  );
}

export function attemptCookieName(attemptId: string) {
  return `alphaquiz-attempt-${attemptId}`;
}

export function readRequestCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const entry of cookieHeader.split(";")) {
    const [key, ...valueParts] = entry.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}
