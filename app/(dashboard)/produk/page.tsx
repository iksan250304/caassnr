import { createClient } from "@/lib/supabase/server";
import ProductActionTabs from "@/components/ProductActionTabs";
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
        <h1 className="font-display text-2xl">Panel Produk</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Ulas antrean, tandai revisi, atau berikan ACC untuk meneruskan ke Purchasing.
        </p>
      </div>

      <ProductActionTabs
        queue={(queue as Artwork[] | null) ?? []}
        history={(history as Artwork[] | null) ?? []}
      />
    </div>
  );
}
