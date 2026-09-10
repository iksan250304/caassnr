import { createClient } from "@/lib/supabase/server";
import DesignActionTabs from "@/components/DesignActionTabs";
import { Artwork, ApprovalLog } from "@/lib/types";

export default async function DesignPage() {
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

  // Seluruh tim Design melihat artwork SATU SAMA LAIN (bukan cuma milik sendiri),
  // supaya kalau satu orang berhalangan, yang lain bisa bantu cek/revisi.
  const { data: artworks } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
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

  // Siapa yang TERAKHIR benar-benar kirim/revisi tiap artwork — bisa beda dari
  // pengunggah pertama (artwork.creator) kalau rekan lain yang bantu revisi.
  // Penting untuk jejak audit karena tim saling bisa bantu sekarang.
  const allIds = (artworks ?? []).map((a) => a.id);
  let submittedByMap: Record<string, { name: string; at: string }> = {};
  if (allIds.length) {
    const { data: submittedLogs } = await supabase
      .from("approval_logs")
      .select("artwork_id, signed_at, actor:actor_id(full_name)")
      .in("artwork_id", allIds)
      .eq("action", "submitted")
      .order("signed_at", { ascending: false });
    for (const log of submittedLogs ?? []) {
      if (!submittedByMap[log.artwork_id]) {
        submittedByMap[log.artwork_id] = {
          name: (log as any).actor?.full_name ?? "-",
          at: log.signed_at,
        };
      }
    }
  }

  const history = (artworks as Artwork[] | null) ?? [];
  const revisionQueue = history
    .filter((a) => a.status === "rejected_product")
    .map((a) => ({ artwork: a, feedback: feedbackMap[a.id] }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Meja Desain</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          {isAdmin
            ? "Mode admin — menampilkan artwork dari seluruh tim Design."
            : "Ajukan artwork baru, atau bantu cek/revisi punya rekan satu tim."}
        </p>
      </div>

      <DesignActionTabs
        revisionQueue={revisionQueue}
        history={history}
        feedbackMap={feedbackMap}
        isAdmin={isAdmin}
        submittedByMap={submittedByMap}
      />
    </div>
  );
}