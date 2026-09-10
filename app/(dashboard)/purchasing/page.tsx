import { createClient } from "@/lib/supabase/server";
import PurchasingActionTabs from "@/components/PurchasingActionTabs";
import { Artwork } from "@/lib/types";

export default async function PurchasingPage() {
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Panel Purchasing</h1>
          <p className="mt-1 font-mono text-xs text-inkfaint">
            {isAdmin
              ? "Mode admin — bisa edit/hapus artwork mana pun (kecuali sudah naik cetak)."
              : "Unduh artwork yang sudah di-ACC dan naikkan ke proses cetak."}
          </p>
        </div>
        <a
          href="https://drive.google.com/drive/folders/1VphrOv8CqYyzyi5s1d0V0PvrH-8ZarH5"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink transition hover:bg-ink hover:text-paper"
        >
          Buka Google Drive
        </a>
      </div>

      <PurchasingActionTabs
        ready={(approved as Artwork[] | null) ?? []}
        history={(printed as Artwork[] | null) ?? []}
        isAdmin={isAdmin}
      />
    </div>
  );
}