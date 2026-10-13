import { Artwork } from "@/lib/types";

// Cari di judul, deskripsi, nama pengaju, dan Job No. Hasil diurutkan dari
// yang terbaru, jadi file dobel atau bernama mirip selalu muncul versi terbarunya dulu.
export function filterAndSortHistory(items: Artwork[], query: string): Artwork[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((a) =>
        [a.title, a.description ?? "", a.creator?.full_name ?? "", a.id.slice(0, 8)].some(
          (field) => field.toLowerCase().includes(q)
        )
      )
    : items;

  return [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}