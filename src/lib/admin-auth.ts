import { redactError } from "@/lib/error-redaction";
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

type AdminAuthentication =
  | { state: "authorized"; admin: AuthenticatedAdmin }
  | { state: "unauthenticated" }
  | { state: "forbidden" };

export function isAllowedAdminEmail(email: string) {
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredAdminEmail) return false;
  return email === configuredAdminEmail;
}

async function getAuthenticatedAdmin(): Promise<AdminAuthentication> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "unauthenticated" };
  }

  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || !email) return { state: "unauthenticated" };
  if (!isAllowedAdminEmail(email)) return { state: "forbidden" };

  return {
    state: "authorized",
    admin: {
      client: supabase,
      user: { id: data.user.id, email },
    },
  };
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const authentication = await getAuthenticatedAdmin();
  return authentication.state === "authorized"
    ? authentication.admin.user
    : null;
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
      console.error("[AlphaQuiz Auth] Ungültige APP_ORIGIN-Konfiguration", redactError(error));
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

  const authentication = await getAuthenticatedAdmin();
  if (authentication.state === "unauthenticated") {
    return {
      client: null,
      user: null,
      response: Response.json(
        { error: "Du musst als Administrator angemeldet sein." },
        { status: 401 },
      ),
    } as const;
  }

  if (authentication.state === "forbidden") {
    return {
      client: null,
      user: null,
      response: Response.json(
        { error: "Dieses Konto ist nicht als AlphaQuiz-Administrator freigeschaltet." },
        { status: 403 },
      ),
    } as const;
  }

  return { ...authentication.admin, response: null } as const;
}
