import { createClient } from "@/lib/supabase/server";
import RevisionQueueList from "@/components/RevisionQueueList";
import { ApprovalLog } from "@/lib/types";

export default async function DesignRevisiPage() {
  const supabase = createClient();

  const { data: rejected } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("status", "rejected_product")
    .order("created_at", { ascending: false });

  const ids = (rejected ?? []).map((a) => a.id);

  let feedbackMap: Record<string, ApprovalLog> = {};
  let submittedByMap: Record<string, { name: string; at: string }> = {};

  if (ids.length) {
    const [{ data: rejectLogs }, { data: submitLogs }] = await Promise.all([
      supabase
        .from("approval_logs")
        .select("*")
        .in("artwork_id", ids)
        .eq("action", "rejected")
        .order("signed_at", { ascending: false }),
      supabase
        .from("approval_logs")
        .select("artwork_id, signed_at, actor:actor_id(full_name)")
        .in("artwork_id", ids)
        .eq("action", "submitted")
        .order("signed_at", { ascending: false }),
    ]);

    for (const log of rejectLogs ?? []) {
      if (!feedbackMap[log.artwork_id]) feedbackMap[log.artwork_id] = log as ApprovalLog;
    }
    for (const log of submitLogs ?? []) {
      if (!submittedByMap[log.artwork_id]) {
        submittedByMap[log.artwork_id] = {
          name: (log as any).actor?.full_name ?? "-",
          at: log.signed_at,
        };
      }
    }
  }

  const revisionQueue = (rejected ?? []).map((artwork: any) => ({
    artwork,
    feedback: feedbackMap[artwork.id],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Revisi</h1>
        <p className="mt-1 text-sm text-inkfaint">
          Artwork yang perlu direvisi — siapa saja di tim Design boleh bantu.
        </p>
      </div>

      <RevisionQueueList revisionQueue={revisionQueue} submittedByMap={submittedByMap} />
    </div>
  );
}