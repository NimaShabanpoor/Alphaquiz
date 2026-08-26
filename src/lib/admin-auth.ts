import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
};

export function isAllowedAdminEmail(email: string) {
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (process.env.NODE_ENV === "production" && !configuredAdminEmail) {
    return false;
  }
  return !configuredAdminEmail || email === configuredAdminEmail;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || !email) return null;
  if (!isAllowedAdminEmail(email)) return null;

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

  const user = await getAdminUser();
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
