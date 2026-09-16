import { createClient } from "@/lib/supabase/server";
import ProductHistoryList from "@/components/ProductHistoryList";
import { Artwork } from "@/lib/types";

export default async function ProdukRiwayatPage() {
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

  const { data: history } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .in("status", ["approved_product", "rejected_product", "printed"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Riwayat</h1>
        <p className="mt-1 text-sm text-inkfaint">Riwayat review yang sudah diputuskan.</p>
      </div>

      <ProductHistoryList history={(history as Artwork[] | null) ?? []} isAdmin={isAdmin} />
    </div>
  );
}