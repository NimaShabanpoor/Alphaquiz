import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  createContentSecurityPolicy,
  CSP_REPORT_GROUP,
  CSP_REPORT_PATH,
} from "@/lib/content-security-policy";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const SESSION_HEADER_NAMES = ["cache-control", "expires", "pragma"] as const;
const PROTECTED_PAGE_ROOTS = [
  "/quizzes",
  "/questions",
  "/categories",
  "/exams",
  "/exam-activity",
  "/exam-results",
  "/import",
  "/export",
  "/preview",
  "/settings",
] as const;

function isProtectedPage(pathname: string) {
  return (
    pathname === "/" ||
    PROTECTED_PAGE_ROOTS.some(
      (root) => pathname === root || pathname.startsWith(`${root}/`),
    )
  );
}

function createPageResponse(requestHeaders: Headers) {
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function refreshSession(request: NextRequest, requestHeaders: Headers) {
  let response = createPageResponse(requestHeaders);

  try {
    const { url, publishableKey } = getSupabasePublicConfig();
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          requestHeaders.set("cookie", request.cookies.toString());
          response = createPageResponse(requestHeaders);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
          }
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    return { authenticated: Boolean(data.user) && !error, response };
  } catch {
    return { authenticated: false, response };
  }
}

function redirectToLogin(request: NextRequest, sessionResponse: NextResponse) {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath !== "/") loginUrl.searchParams.set("next", nextPath);

  const redirect = NextResponse.redirect(loginUrl);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const name of SESSION_HEADER_NAMES) {
    const value = sessionResponse.headers.get(name);
    if (value) redirect.headers.set(name, value);
  }
  return redirect;
}

function applyContentSecurityPolicy(
  response: NextResponse,
  policy: string,
  reportEndpoint: string,
) {
  response.headers.set("Content-Security-Policy-Report-Only", policy);
  response.headers.set(
    "Reporting-Endpoints",
    `${CSP_REPORT_GROUP}="${reportEndpoint}"`,
  );
  response.headers.set(
    "Report-To",
    JSON.stringify({
      group: CSP_REPORT_GROUP,
      max_age: 10_886_400,
      endpoints: [{ url: reportEndpoint }],
      include_subdomains: true,
    }),
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = createContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV !== "production",
  );
  const reportEndpoint = new URL(CSP_REPORT_PATH, request.url).toString();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy-Report-Only", policy);

  if (!isProtectedPage(request.nextUrl.pathname)) {
    return applyContentSecurityPolicy(
      createPageResponse(requestHeaders),
      policy,
      reportEndpoint,
    );
  }

  const session = await refreshSession(request, requestHeaders);
  if (session.authenticated) {
    return applyContentSecurityPolicy(
      session.response,
      policy,
      reportEndpoint,
    );
  }

  // This is an optimistic UX redirect only. Every protected Route Handler
  // performs its own server-side getUser() verification through requireAdmin.
  return applyContentSecurityPolicy(
    redirectToLogin(request, session.response),
    policy,
    reportEndpoint,
  );
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
