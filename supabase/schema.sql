-- ============================================================
-- Skema database aplikasi Buku Tamu (Supabase / Postgres)
-- Cara pakai: buka Supabase Dashboard > SQL Editor > New query,
-- tempel seluruh isi file ini, lalu klik Run.
-- ============================================================

create table guests (
  id bigint generated always as identity primary key,
  name text not null,
  origin text not null,
  card_code text not null unique,
  qr_payload text not null unique,
  attended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aktifkan Row Level Security agar akses diatur lewat policy.
alter table guests enable row level security;

-- ============================================================
-- CATATAN KEAMANAN (MVP tanpa login)
-- Policy di bawah ini mengizinkan peran `anon` (pemegang anon key
-- publik) untuk membaca, menambah, mengubah, dan menghapus SEMUA
-- data tamu. Ini disengaja supaya aplikasi langsung bisa dipakai
-- sebagai MVP, sama seperti perilaku aslinya.
--
-- UNTUK PRODUKSI disarankan:
-- 1. Aktifkan Supabase Auth (mis. login email untuk panitia).
-- 2. Ganti policy di bawah dengan policy yang memeriksa
--    auth.role() = 'authenticated' atau kepemilikan data.
-- ============================================================

create policy "guests_select_anon"
  on guests for select
  to anon
  using (true);

create policy "guests_insert_anon"
  on guests for insert
  to anon
  with check (true);

create policy "guests_update_anon"
  on guests for update
  to anon
  using (true)
  with check (true);

create policy "guests_delete_anon"
  on guests for delete
  to anon
  using (true);
