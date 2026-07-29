import "server-only";
import { createClient } from "@supabase/supabase-js";

function normalizeProjectUrl(value?: string) {
  if (!value) return null;
  const clean = value.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "");
  try {
    const parsed = new URL(clean);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".supabase.co")
    ) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }
    if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
      const databaseHost = parsed.hostname.match(
        /^db\.([a-z0-9-]+)\.supabase\.co$/i,
      );
      if (databaseHost) return `https://${databaseHost[1]}.supabase.co`;

      const poolerRef = decodeURIComponent(parsed.username).match(
        /^postgres\.([a-z0-9-]+)$/i,
      );
      if (poolerRef) return `https://${poolerRef[1]}.supabase.co`;
    }
  } catch {
    return null;
  }
  return null;
}

export function getSupabaseAdmin() {
  const rawUrl = process.env.SUPABASE_URL;
  const url = normalizeProjectUrl(rawUrl);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const configured = Boolean(rawUrl && key);

  if (!url || !key) {
    return {
      configured,
      client: null,
      error: configured
        ? "SUPABASE_URL ist weder eine Projekt- noch eine unterstützte PostgreSQL-Adresse."
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
