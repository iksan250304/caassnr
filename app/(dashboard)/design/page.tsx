import { createClient } from "@/lib/supabase/server";
import UploadArtworkForm from "@/components/UploadArtworkForm";
import DesignArtworkItem from "@/components/DesignArtworkItem";
import { Artwork, ApprovalLog } from "@/lib/types";

export default async function DesignPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artworks } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("created_by", user!.id)
    .order("created_at", { ascending: false });

  const rejectedIds = (artworks ?? [])
    .filter((a) => a.status === "rejected_product")
    .map((a) => a.id);

  let feedbackMap: Record<string, ApprovalLog> = {};
  if (rejectedIds.length) {
    const { data: logs } = await supabase
      .from("approval_logs")
      .select("*")
      .in("artwork_id", rejectedIds)
      .eq("action", "rejected")
      .order("signed_at", { ascending: false });
    for (const log of logs ?? []) {
      if (!feedbackMap[log.artwork_id]) feedbackMap[log.artwork_id] = log as ApprovalLog;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Meja Desain</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Ajukan artwork baru dan pantau statusnya sampai naik cetak.
        </p>
      </div>

      <UploadArtworkForm mode="create" />

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
          Riwayat Pengajuan ({artworks?.length ?? 0})
        </p>
        {!artworks?.length && (
          <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
            Belum ada artwork yang diajukan.
          </p>
        )}
        {(artworks as Artwork[] | null)?.map((artwork) => (
          <DesignArtworkItem
            key={artwork.id}
            artwork={artwork}
            latestFeedback={feedbackMap[artwork.id]}
          />
        ))}
      </div>
    </div>
  );
}
