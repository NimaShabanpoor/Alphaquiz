import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "alphaquiz-access-token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath !== "/") loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
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
