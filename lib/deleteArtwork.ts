import { createClient } from "@/lib/supabase/client";

/**
 * Menghapus artwork BESERTA seluruh file fisiknya di storage (semua versi:
 * asli, markup, approved, print-ready, approval-sheet) supaya tidak ada file
 * nganggur numpuk.
 *
 * Urutannya sengaja: baris database dihapus LEBIH DULU, file fisik belakangan.
 * Kalau database menolak (trigger/RLS), proses berhenti dan semua file tetap utuh.
 */
export async function deleteArtworkWithFiles(artworkId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  // 1. Catat daftar file dulu (hanya baca, belum ada yang dihapus).
  const { data: files } = await supabase.storage.from("artworks").list(artworkId);
  const paths = (files ?? []).map((f) => `${artworkId}/${f.name}`);

  // 2. Hapus baris database. .select("id") dipakai untuk memastikan ada baris
  //    yang benar-benar terhapus: RLS yang memblokir diam-diam tidak memberi
  //    error, hanya 0 baris.
  const { data: deleted, error } = await supabase
    .from("artworks")
    .delete()
    .eq("id", artworkId)
    .select("id");
  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    return { error: "Artwork tidak terhapus (kemungkinan tidak ada izin). File tidak disentuh." };
  }

  // 3. Baru hapus file fisiknya.
  if (paths.length) {
    await supabase.storage.from("artworks").remove(paths);
  }
  return {};
}