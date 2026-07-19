import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("The Supabase admin client cannot run in the browser.");
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseSecretKey?.startsWith("sb_secret_")) {
  throw new Error(
    "Missing or invalid SUPABASE_SECRET_KEY for admin server routes (expected sb_secret_...)."
  );
}

export const supabaseAdminServer = createClient<Database>(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
