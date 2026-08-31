import { createClient } from "@/lib/supabase/server";
import DesignActionTabs from "@/components/DesignActionTabs";
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

  const history = (artworks as Artwork[] | null) ?? [];
  const revisionQueue = history
    .filter((a) => a.status === "rejected_product")
    .map((a) => ({ artwork: a, feedback: feedbackMap[a.id] }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Meja Desain</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Ajukan artwork baru dan pantau statusnya sampai naik cetak.
        </p>
      </div>

      <DesignActionTabs
        revisionQueue={revisionQueue}
        history={history}
        feedbackMap={feedbackMap}
      />
    </div>
  );
}
