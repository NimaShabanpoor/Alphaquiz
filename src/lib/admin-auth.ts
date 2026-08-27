import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AppOriginConfigurationError,
  trustedMutationOrigin,
} from "@/lib/app-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
};

type AuthenticatedAdmin = {
  client: SupabaseClient;
  user: AdminUser;
};

export function isAllowedAdminEmail(email: string) {
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (process.env.NODE_ENV === "production" && !configuredAdminEmail) {
    return false;
  }
  return !configuredAdminEmail || email === configuredAdminEmail;
}

async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
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

  return {
    client: supabase,
    user: { id: data.user.id, email },
  };
}

export async function getAdminUser(): Promise<AdminUser | null> {
  return (await getAuthenticatedAdmin())?.user ?? null;
}

export async function requireAdmin(request: Request) {
  try {
    if (!trustedMutationOrigin(request)) {
      return {
        client: null,
        user: null,
        response: Response.json(
          { error: "Diese Anfrage stammt nicht von AlphaQuiz." },
          { status: 403 },
        ),
      } as const;
    }
  } catch (error) {
    if (error instanceof AppOriginConfigurationError) {
      console.error("[AlphaQuiz Auth] Ungültige APP_ORIGIN-Konfiguration", error);
      return {
        client: null,
        user: null,
        response: Response.json(
          { error: "Die Anwendung ist nicht vollständig konfiguriert." },
          { status: 503 },
        ),
      } as const;
    }
    throw error;
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return {
      client: null,
      user: null,
      response: Response.json(
        { error: "Du musst als Administrator angemeldet sein." },
        { status: 401 },
      ),
    } as const;
  }

  return { ...admin, response: null } as const;
}
