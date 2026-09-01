type FetchLike = typeof fetch;

export async function assertSupabaseTestInstanceReachable(
  supabaseUrl: string,
  fetchInstance: FetchLike = fetch,
) {
  try {
    const response = await fetchInstance(`${supabaseUrl}/auth/v1/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) return;
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      "Die Supabase-Testinstanz ist nicht erreichbar. Das ist kein " +
        "Autorisierungs-Testfehler. Starte die Wegwerf-Instanz mit " +
        `"supabase start" und führe den Test erneut aus. (${detail})`,
      { cause: error },
    );
  }
}
