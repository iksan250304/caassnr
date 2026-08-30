import { createClient } from "@/lib/supabase/server";
import PurchasingItem from "@/components/PurchasingItem";
import { Artwork } from "@/lib/types";

export default async function PurchasingPage() {
  const supabase = createClient();

  const { data: approved } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("status", "approved_product")
    .order("created_at", { ascending: true });

  const { data: printed } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("status", "printed")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Meja Purchasing</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Unduh artwork yang sudah di-ACC dan naikkan ke proses cetak.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-approve">
          Siap Cetak ({approved?.length ?? 0})
        </p>
        {!approved?.length && (
          <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
            Belum ada artwork yang disetujui tim produk.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(approved as Artwork[] | null)?.map((artwork) => (
            <PurchasingItem key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
          Riwayat Naik Cetak
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(printed as Artwork[] | null)?.map((artwork) => (
            <PurchasingItem key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </div>
    </div>
  );
}
