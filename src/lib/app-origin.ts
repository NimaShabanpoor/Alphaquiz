import "server-only";

const DEVELOPMENT_ORIGIN = "http://localhost:3000";

export class AppOriginConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppOriginConfigurationError";
  }
}

export function getAppOrigin() {
  const configured = process.env.APP_ORIGIN?.trim();
  const value =
    configured ||
    (process.env.NODE_ENV !== "production" ? DEVELOPMENT_ORIGIN : "");

  if (!value) {
    throw new AppOriginConfigurationError(
      "APP_ORIGIN muss in der Produktionsumgebung gesetzt sein.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppOriginConfigurationError("APP_ORIGIN ist keine gültige URL.");
  }

  if (
    url.origin !== value.replace(/\/$/, "") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new AppOriginConfigurationError(
      "APP_ORIGIN darf nur aus Schema, Host und optionalem Port bestehen.",
    );
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new AppOriginConfigurationError(
      "APP_ORIGIN muss in der Produktion HTTPS verwenden.",
    );
  }

  return url.origin;
}

export function trustedMutationOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === getAppOrigin();
}
