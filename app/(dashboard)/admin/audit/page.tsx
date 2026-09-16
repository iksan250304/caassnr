import { createClient } from "@/lib/supabase/server";
import AdminAuditTrail from "@/components/AdminAuditTrail";

export default async function AdminAuditPage() {
  const supabase = createClient();

  const { data: logs } = await supabase
    .from("approval_logs")
    .select("*, actor:actor_id(full_name, role), artwork:artwork_id(title, status)")
    .order("signed_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Audit Trail</h1>
        <p className="mt-1 text-sm text-inkfaint">Seluruh riwayat aktivitas persetujuan.</p>
      </div>

      <AdminAuditTrail logs={(logs as any[]) ?? []} />
    </div>
  );
}