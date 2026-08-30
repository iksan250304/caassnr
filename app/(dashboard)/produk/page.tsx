import { createClient } from "@/lib/supabase/server";
import ArtworkTicket from "@/components/ArtworkTicket";
import { Artwork } from "@/lib/types";

export default async function ProdukPage() {
  const supabase = createClient();

  const { data: queue } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("status", "pending_product")
    .order("created_at", { ascending: true });

  const { data: history } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .in("status", ["approved_product", "rejected_product", "printed"])
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Meja Produk</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Ulas antrean, tandai revisi, atau berikan ACC untuk meneruskan ke Purchasing.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">
          Antrean Review ({queue?.length ?? 0})
        </p>
        {!queue?.length && (
          <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
            Tidak ada artwork yang menunggu review.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(queue as Artwork[] | null)?.map((artwork) => (
            <ArtworkTicket
              key={artwork.id}
              artwork={artwork}
              href={`/produk/${artwork.id}`}
              actionLabel="Review"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
          Riwayat Terbaru
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(history as Artwork[] | null)?.map((artwork) => (
            <ArtworkTicket key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </div>
    </div>
  );
}
