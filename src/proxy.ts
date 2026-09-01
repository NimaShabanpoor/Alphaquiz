import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const SESSION_HEADER_NAMES = ["cache-control", "expires", "pragma"] as const;

async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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

          response = NextResponse.next({ request });
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

export async function proxy(request: NextRequest) {
  const session = await refreshSession(request);
  if (session.authenticated) return session.response;

  // This is an optimistic UX redirect only. Every protected Route Handler
  // performs its own server-side getUser() verification through requireAdmin.
  return redirectToLogin(request, session.response);
}

export const config = {
  matcher: [
    "/",
    "/quizzes/:path*",
    "/questions/:path*",
    "/categories/:path*",
    "/exams/:path*",
    "/exam-activity/:path*",
    "/exam-results/:path*",
    "/import/:path*",
    "/export/:path*",
    "/preview/:path*",
    "/settings/:path*",
  ],
};
