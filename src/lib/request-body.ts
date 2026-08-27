import "server-only";

export class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export async function readJsonBody(request: Request, maxBytes = 64 * 1024) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new RequestBodyError("Erwartet werden JSON-Daten.", 415);
  }

  const announcedLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(announcedLength) && announcedLength > maxBytes) {
    throw new RequestBodyError("Die Anfrage ist zu gross.", 413);
  }

  const source = await request.text();
  if (Buffer.byteLength(source, "utf8") > maxBytes) {
    throw new RequestBodyError("Die Anfrage ist zu gross.", 413);
  }

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new RequestBodyError("Die JSON-Daten sind ungültig.", 400);
  }
}
