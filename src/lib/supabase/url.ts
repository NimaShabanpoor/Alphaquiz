const LOCAL_SUPABASE_HOSTS = new Set(["localhost", "127.0.0.1"]);

function normalizeConfiguredValue(value?: string) {
  return value?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "");
}

export function normalizeSupabaseUrl(value?: string): string | null {
  const clean = normalizeConfiguredValue(value);
  if (!clean) return null;

  try {
    const parsed = new URL(clean);

    if (parsed.protocol === "https:") {
      return parsed.origin;
    }

    if (
      parsed.protocol === "http:" &&
      LOCAL_SUPABASE_HOSTS.has(parsed.hostname)
    ) {
      return parsed.origin;
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

export function resolveSupabaseUrl(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = normalizeSupabaseUrl(value);
    if (normalized) return normalized;
  }

  return null;
}
