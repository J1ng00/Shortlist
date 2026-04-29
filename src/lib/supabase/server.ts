import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function usableServiceRoleKey(key: string | undefined) {
  if (!key || key === "your_supabase_service_role_key") {
    return undefined;
  }

  return key;
}

export function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, usableServiceRoleKey(supabaseServiceRoleKey) ?? supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
}
