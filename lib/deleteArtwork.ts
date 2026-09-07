import { createClient } from "@/lib/supabase/client";

/**
 * Menghapus artwork BESERTA seluruh file fisiknya di storage (semua versi:
 * asli, markup, approved, print-ready, approval-sheet) supaya tidak ada file
 * nganggur numpuk. RLS + trigger di database tetap menolak ini kalau status
 * artwork sudah 'printed', jadi aman dipanggil dari mana saja.
 */
export async function deleteArtworkWithFiles(artworkId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: files, error: listError } = await supabase.storage
    .from("artworks")
    .list(artworkId);

  if (!listError && files && files.length) {
    const paths = files.map((f) => `${artworkId}/${f.name}`);
    await supabase.storage.from("artworks").remove(paths);
  }

  const { error } = await supabase.from("artworks").delete().eq("id", artworkId);
  if (error) return { error: error.message };
  return {};
}