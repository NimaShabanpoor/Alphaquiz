import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_REPORT_BYTES = 32 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
] as const;

function limitedText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function safeUrl(value: unknown) {
  const source = limitedText(value, 2_000);
  if (!source) return undefined;
  try {
    const url = new URL(source);
    return `${url.origin}${url.pathname}`.slice(0, 1_000);
  } catch {
    return source.split(/[?#]/, 1)[0].slice(0, 1_000);
  }
}

function reportEntries(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload
      .slice(0, 10)
      .flatMap((entry) =>
        entry && typeof entry === "object"
          ? [((entry as Record<string, unknown>).body ?? entry) as Record<
              string,
              unknown
            >]
          : [],
      );
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const legacy = record["csp-report"];
  return legacy && typeof legacy === "object"
    ? [legacy as Record<string, unknown>]
    : [record];
}

function reportValue(
  report: Record<string, unknown>,
  modern: string,
  legacy: string,
) {
  return report[modern] ?? report[legacy];
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(
    request,
    "csp-report",
    20,
    60_000,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: rateLimit.unavailable
          ? "CSP-Meldungen sind vorübergehend nicht verfügbar."
          : "Zu viele CSP-Meldungen.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!ALLOWED_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
    return Response.json({ error: "Ungültiger Berichtstyp." }, { status: 415 });
  }

  const announcedLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(announcedLength) && announcedLength > MAX_REPORT_BYTES) {
    return Response.json({ error: "Der Bericht ist zu gross." }, { status: 413 });
  }

  const source = await request.text();
  if (Buffer.byteLength(source, "utf8") > MAX_REPORT_BYTES) {
    return Response.json({ error: "Der Bericht ist zu gross." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(source);
  } catch {
    return Response.json({ error: "Der Bericht ist ungültig." }, { status: 400 });
  }

  const entries = reportEntries(payload);
  if (entries.length === 0) {
    return Response.json({ error: "Der Bericht ist ungültig." }, { status: 400 });
  }

  for (const report of entries) {
    console.warn("[AlphaQuiz CSP] Report-Only-Verstoss", {
      document: safeUrl(reportValue(report, "documentURL", "document-uri")),
      blocked: safeUrl(reportValue(report, "blockedURL", "blocked-uri")),
      source: safeUrl(reportValue(report, "sourceFile", "source-file")),
      directive: limitedText(
        reportValue(report, "effectiveDirective", "effective-directive"),
        120,
      ),
      disposition: limitedText(report.disposition, 40),
      statusCode: Number(reportValue(report, "statusCode", "status-code")) || 0,
      timestamp: new Date().toISOString(),
    });
  }

  return new Response(null, { status: 204 });
}
