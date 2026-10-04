import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True jika kedua env Supabase sudah diisi. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Client tetap dibuat agar import tidak gagal saat env belum diisi,
// tapi semua fungsi di api.ts akan melempar Error sebelum client dipakai.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
);
