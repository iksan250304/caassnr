import { createClient } from "@/lib/supabase/server";
import ProductActionTabs from "@/components/ProductActionTabs";
import { Artwork, ApprovalLog } from "@/lib/types";

export default async function ProdukPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = profile?.role === "admin";

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

  // Tandai item antrean yang sebenarnya "kiriman balik" dari Purchasing karena
  // ditemukan kesalahan, supaya Produk tahu ini bukan pengajuan baru biasa.
  const queueIds = (queue ?? []).map((a) => a.id);
  let returnedMap: Record<string, ApprovalLog> = {};
  if (queueIds.length) {
    const { data: returnedLogs } = await supabase
      .from("approval_logs")
      .select("*, actor:actor_id(full_name)")
      .in("artwork_id", queueIds)
      .eq("action", "returned_by_purchasing")
      .order("signed_at", { ascending: false });
    for (const log of returnedLogs ?? []) {
      if (!returnedMap[log.artwork_id]) returnedMap[log.artwork_id] = log as ApprovalLog;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Panel Produk</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          {isAdmin
            ? "Mode admin — bisa edit/hapus artwork mana pun (kecuali sudah naik cetak)."
            : "Ulas antrean, tandai revisi, atau berikan ACC untuk meneruskan ke Purchasing."}
        </p>
      </div>

      <ProductActionTabs
        queue={(queue as Artwork[] | null) ?? []}
        history={(history as Artwork[] | null) ?? []}
        isAdmin={isAdmin}
        returnedMap={returnedMap}
      />
    </div>
  );
}