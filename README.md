# CAAS — Content Approval Artwork System

Aplikasi Next.js + Supabase untuk alur persetujuan artwork digital: **Design → Produk → Purchasing**, lengkap dengan stempel tanda tangan digital otomatis dan audit trail.

## Fitur yang sudah diimplementasikan

- Login berbasis email/password (akun dibuat oleh Admin, sesuai spek — tidak ada self-registration).
- **Tim Design**: unggah artwork (PDF ≤10MB), lihat status, unggah revisi (auto-increment versi) setelah ditolak.
- **Tim Produk**: antrean review, coret/tandai revisi langsung di atas PDF (kanvas overlay tinta merah), ACC (otomatis membubuhkan stempel TTD digital) atau Tolak dengan catatan.
- **Tim Purchasing**: unduh PDF yang sudah berstempel TTD, tombol "Naik Cetak" yang membubuhkan stempel TTD akhir purchasing dan mengunci dokumen.
- **Admin**: CRUD user (Design/Produk/Purchasing/Admin) dan tabel audit trail lengkap (siapa melakukan apa, kapan).
- Row Level Security penuh di Postgres sesuai peran, plus trigger yang mengunci dokumen berstatus `printed` agar tidak bisa diubah/dihapus.

## 1. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**. Catat nama, password database, dan region (pilih Singapore untuk latensi terbaik dari Indonesia).
2. Setelah project selesai dibuat (±2 menit), buka **Project Settings → API**. Anda akan butuh 3 nilai:
   - `Project URL` → jadi `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (klik "Reveal") → jadi `SUPABASE_SERVICE_ROLE_KEY` — **jaga kerahasiaannya, jangan pernah expose ke browser/klien**.

## 2. Jalankan skema database

1. Di dashboard Supabase, buka **SQL Editor → New query**.
2. Salin seluruh isi file `supabase/schema.sql` dari project ini, tempel, lalu **Run**.
3. Ini akan membuat tabel `profiles`, `artworks`, `approval_logs`, seluruh RLS policy, trigger pengunci dokumen `printed`, dan storage bucket `artworks` (privat, hanya PDF, maks 10MB).

## 3. Buat akun Admin pertama

Karena sistem ini tidak punya self-registration (sesuai desain — admin yang membuat user), akun admin pertama dibuat manual:

1. Di dashboard Supabase → **Authentication → Users → Add user**. Isi email & password, centang "Auto Confirm User".
2. Salin **User UID** yang muncul.
3. Kembali ke **SQL Editor**, jalankan (ganti UUID dan nama):
   ```sql
   insert into profiles (id, full_name, role)
   values ('PASTE-USER-UUID-DI-SINI', 'Nama Admin', 'admin');
   ```
4. Login pertama kali di aplikasi akan otomatis masuk ke Panel Admin. Dari situ, seluruh user Design/Produk/Purchasing berikutnya bisa dibuat lewat UI (Panel Admin → Tambah User) — tidak perlu lagi lewat SQL Editor.

## 4. Jalankan aplikasi secara lokal

```bash
npm install
cp .env.local.example .env.local
# isi .env.local dengan 3 nilai dari langkah 1

npm run dev
```

Buka `http://localhost:3000`, login dengan akun admin yang dibuat di langkah 3.

## 5. Deploy

Cara termudah: [Vercel](https://vercel.com).

1. Push project ini ke GitHub.
2. Import repo di Vercel.
3. Tambahkan 3 environment variable yang sama seperti `.env.local` di pengaturan project Vercel.
4. Deploy.

## Struktur proyek

```
app/
  login/                    halaman login
  (dashboard)/
    design/                 dashboard tim design
    produk/                 antrean & halaman review+annotate PDF
    purchasing/             daftar siap cetak & naik cetak
    admin/                  CRUD user & audit trail
  api/admin/users/          endpoint admin (pakai service role key, tervalidasi role admin)
components/
  PdfReviewer.tsx           viewer PDF + coretan tangan (canvas) + stamping via pdf-lib
  UploadArtworkForm.tsx     form unggah baru / revisi
  ...
lib/
  supabase/                 client Supabase (browser, server, admin)
  storage.ts                helper validasi & signed URL file
  types.ts                  tipe TypeScript sesuai skema DB
supabase/
  schema.sql                seluruh skema, RLS, trigger, storage bucket
```

## Catatan implementasi & batasan yang perlu diketahui

- **Stempel TTD digital**: saat ini berupa kotak teks (nama, peran, waktu) yang di-burn ke PDF via `pdf-lib` — bukan gambar tanda tangan manual. Kolom `signature_url` di tabel `profiles` sudah disiapkan bila ke depan Anda ingin menambahkan upload gambar tanda tangan asli untuk ditempel.
- **Coretan revisi**: digambar bebas (freehand) per halaman di atas kanvas transparan, lalu di-flatten menjadi gambar dan ditempel ke PDF asli saat submit — bukan anotasi PDF native (belum mendukung anotasi vektor yang bisa diedit ulang oleh Design).
- **Desain visual**: mengambil motif dunia percetakan (*registration/crop marks*, docket/tiket job cetak, warna tinta proof) agar terasa sesuai konteks alur kerja artwork, bukan template dashboard generik.
- Untuk produksi nyata, pertimbangkan menambah: notifikasi email saat status berubah, riwayat versi yang bisa dibuka satu per satu (saat ini hanya versi terbaru yang tersimpan sebagai `file_url` aktif, versi lama tetap ada di Storage tapi belum ada UI untuk membukanya), serta 2FA untuk role admin.
