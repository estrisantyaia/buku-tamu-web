# Buku Tamu — Aplikasi Web Mandiri

Aplikasi buku tamu digital untuk acara pernikahan, hasil porting dari Hatch Space
menjadi aplikasi web mandiri (Vite + React + TypeScript + Tailwind CSS v4) dengan
database **Supabase**. Siap di-deploy ke **Vercel**.

Fitur:

- **Scan QR** — scan kartu akses tamu lewat kamera, unggah gambar QR, atau masukkan
  kode kartu manual. Kehadiran langsung tercatat.
- **Tamu** — daftar undangan dengan pencarian, filter kehadiran, tambah/edit/hapus
  tamu, dan tandai kehadiran manual.
- **Kartu** — kartu akses tiap tamu dengan QR, bisa diunduh sebagai PNG untuk
  dibagikan atau dicetak.

## Cara Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) dan buat project baru (gratis).
2. Di dashboard project, buka **SQL Editor** → **New query**.
3. Tempel seluruh isi file `supabase/schema.sql`, lalu klik **Run**.
   Ini membuat tabel `guests` beserta policy aksesnya.

### 3. Isi environment variable

1. Salin `.env.example` menjadi `.env`.
2. Di Supabase Dashboard, buka **Project Settings → API**, lalu salin:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 4. Jalankan lokal

```bash
npm run dev
```

Buka alamat yang ditampilkan (biasanya `http://localhost:5173`).

### 5. Build untuk produksi

```bash
npm run build
```

Hasilnya ada di folder `dist/`.

## Deploy ke Vercel

1. Push project ini ke GitHub.
2. Di [vercel.com](https://vercel.com), pilih **Add New → Project**, lalu import
   repository-nya.
3. Di bagian **Environment Variables**, tambahkan `VITE_SUPABASE_URL` dan
   `VITE_SUPABASE_ANON_KEY` dengan nilai yang sama seperti di `.env`.
4. Klik **Deploy**. Selesai — Vercel memberi link publik otomatis.

## Catatan Keamanan

Policy database di `supabase/schema.sql` mengizinkan anon key untuk semua operasi
(MVP tanpa login). Untuk acara sungguhan, aktifkan Supabase Auth dan batasi policy
hanya untuk panitia yang sudah login.
