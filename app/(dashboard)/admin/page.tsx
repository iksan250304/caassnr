import { createClient } from "@/lib/supabase/server";
import AdminTabs from "@/components/AdminTabs";

export default async function AdminPage() {
  const supabase = createClient();

  const { data: logs } = await supabase
    .from("approval_logs")
    .select("*, actor:actor_id(full_name, role), artwork:artwork_id(title, status)")
    .order("signed_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl">Panel Admin</h1>
        <p className="mt-1 font-mono text-xs text-inkfaint">
          Kelola akses pengguna dan pantau seluruh audit trail persetujuan.
        </p>
      </div>

      <AdminTabs logs={(logs as any[]) ?? []} />
    </div>
  );
}
