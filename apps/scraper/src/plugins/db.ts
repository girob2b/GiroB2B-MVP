import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

export const supabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "scraper" },
  }
);

export async function pingDb(): Promise<boolean> {
  const { error } = await supabase.from("discovered_companies").select("id", { count: "exact", head: true }).limit(1);
  return !error;
}
