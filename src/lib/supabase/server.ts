import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateSupabaseUrl(url: string | undefined) {
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  try {
    return new URL(url).toString();
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL");
  }
}

function usableServiceRoleKey(key: string | undefined) {
  if (!key || key === "your_supabase_service_role_key") {
    return undefined;
  }

  return key;
}

export function createServerSupabaseClient() {
  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(validateSupabaseUrl(supabaseUrl), usableServiceRoleKey(supabaseServiceRoleKey) ?? supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
}
