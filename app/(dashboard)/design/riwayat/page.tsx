import { createClient } from "@/lib/supabase/server";
import DesignHistoryList from "@/components/DesignHistoryList";
import { Artwork, ApprovalLog } from "@/lib/types";

export default async function DesignRiwayatPage() {
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

  const { data: artworks } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .order("created_at", { ascending: false });

  const history = (artworks as Artwork[] | null) ?? [];
  const allIds = history.map((a) => a.id);
  const rejectedIds = history.filter((a) => a.status === "rejected_product").map((a) => a.id);

  let feedbackMap: Record<string, ApprovalLog> = {};
  let submittedByMap: Record<string, { name: string; at: string }> = {};

  const [rejectRes, submitRes] = await Promise.all([
    rejectedIds.length
      ? supabase
          .from("approval_logs")
          .select("*")
          .in("artwork_id", rejectedIds)
          .eq("action", "rejected")
          .order("signed_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    allIds.length
      ? supabase
          .from("approval_logs")
          .select("artwork_id, signed_at, actor:actor_id(full_name)")
          .in("artwork_id", allIds)
          .eq("action", "submitted")
          .order("signed_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  for (const log of rejectRes.data ?? []) {
    if (!feedbackMap[log.artwork_id]) feedbackMap[log.artwork_id] = log as ApprovalLog;
  }
  for (const log of submitRes.data ?? []) {
    if (!submittedByMap[log.artwork_id]) {
      submittedByMap[log.artwork_id] = {
        name: (log as any).actor?.full_name ?? "-",
        at: log.signed_at,
      };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Riwayat Pengajuan</h1>
        <p className="mt-1 text-sm text-inkfaint">
          {isAdmin
            ? "Mode admin — menampilkan artwork dari seluruh tim Design."
            : "Seluruh artwork yang pernah diajukan tim Design, terbaru dulu."}
        </p>
      </div>

      <DesignHistoryList
        history={history}
        feedbackMap={feedbackMap}
        submittedByMap={submittedByMap}
        isAdmin={isAdmin}
      />
    </div>
  );
}