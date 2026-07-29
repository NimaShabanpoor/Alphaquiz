import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookieOptions = {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  response.cookies.set("alphaquiz-access-token", "", cookieOptions);
  response.cookies.set("alphaquiz-refresh-token", "", cookieOptions);

  return response;
}
