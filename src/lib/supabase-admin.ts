import "server-only";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseUrl } from "@/lib/supabase/url";

export function getSupabaseAdmin() {
  const rawUrl = process.env.SUPABASE_URL;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = resolveSupabaseUrl(rawUrl, publicUrl);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const configured = Boolean((rawUrl || publicUrl) && key);

  if (!url || !key) {
    return {
      configured,
      client: null,
      error: configured
        ? "Es ist keine gültige Supabase-Projektadresse konfiguriert."
        : "Supabase-Umgebungsvariablen fehlen.",
    };
  }

  return {
    configured: true,
    client: createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
    error: null,
  };
}
