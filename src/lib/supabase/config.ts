import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export class SupabasePublicConfigurationError extends Error {
  constructor() {
    super(
      "NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlt.",
    );
    this.name = "SupabasePublicConfigurationError";
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabasePublicConfigurationError();
  }

  return { url, publishableKey };
}
