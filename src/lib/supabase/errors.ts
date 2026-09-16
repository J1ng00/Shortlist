export function getSupabaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Supabase error";
}

export function supabaseUnavailableMessage(error: unknown) {
  return getSupabaseErrorMessage(error);
}
