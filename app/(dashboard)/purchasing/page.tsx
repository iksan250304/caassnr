import { createClient } from "@/lib/supabase/server";
import PurchasingActionTabs from "@/components/PurchasingActionTabs";
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
    .limit(50);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Meja Purchasing</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Unduh artwork yang sudah di-ACC dan naikkan ke proses cetak.
        </p>
      </div>

      <PurchasingActionTabs
        ready={(approved as Artwork[] | null) ?? []}
        history={(printed as Artwork[] | null) ?? []}
      />
    </div>
  );
}
