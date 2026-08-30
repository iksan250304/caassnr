import { createClient } from "@/lib/supabase/server";
import AdminUserManager from "@/components/AdminUserManager";
import StatusBadge from "@/components/StatusBadge";
import { ApprovalLog } from "@/lib/types";
import { format } from "date-fns";

const ACTION_LABEL: Record<string, string> = {
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  sent_to_print: "Naik Cetak",
};

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

      <AdminUserManager />

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
          Audit Trail
        </p>
        <div className="ticket overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 font-mono text-[10px] uppercase tracking-wider text-inkfaint">
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Artwork</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Oleh</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {(logs as any[] | null)?.map((log: ApprovalLog & {
                actor: { full_name: string; role: string };
                artwork: { title: string; status: string };
              }) => (
                <tr key={log.id} className="border-b border-ink/5 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-inkfaint">
                    {format(new Date(log.signed_at), "d MMM yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3">{log.artwork?.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.actor?.full_name}
                  </td>
                  <td className="px-4 py-3 text-xs text-inkfaint">
                    {log.feedback_notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
