import { createClient } from "@/lib/supabase/server";
import PurchasingHistoryList from "@/components/PurchasingHistoryList";
import { Artwork } from "@/lib/types";

export default async function PurchasingRiwayatPage() {
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

  const { data: printed } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("status", "printed")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Riwayat Naik Cetak</h1>
        <p className="mt-1 text-sm text-inkfaint">Semua artwork yang sudah naik cetak.</p>
      </div>

      <PurchasingHistoryList history={(printed as Artwork[] | null) ?? []} isAdmin={isAdmin} />
    </div>
  );
}