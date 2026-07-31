import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const ADMIN_ACCESS_COOKIE = "alphaquiz-access-token";

export type AdminUser = {
  id: string;
  email: string;
};

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const entry of cookieHeader.split(";")) {
    const [key, ...valueParts] = entry.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

export async function getAdminUser(request: Request): Promise<AdminUser | null> {
  const token = readCookie(request, ADMIN_ACCESS_COOKIE);
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase.client) return null;

  const { data, error } = await supabase.client.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || !email) return null;

  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (
    configuredAdminEmail &&
    email !== configuredAdminEmail
  ) {
    return null;
  }

  if (process.env.NODE_ENV === "production" && !configuredAdminEmail) {
    return null;
  }

  return { id: data.user.id, email };
}

export async function requireAdmin(request: Request) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return {
        user: null,
        response: Response.json(
          { error: "Diese Anfrage stammt nicht von AlphaQuiz." },
          { status: 403 },
        ),
      } as const;
    }
  }

  const user = await getAdminUser(request);
  if (!user) {
    return {
      user: null,
      response: Response.json(
        { error: "Du musst als Administrator angemeldet sein." },
        { status: 401 },
      ),
    } as const;
  }

  return { user, response: null } as const;
}
