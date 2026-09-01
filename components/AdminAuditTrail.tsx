import { ApprovalLog } from "@/lib/types";
import { format } from "date-fns";

const ACTION_LABEL: Record<string, string> = {
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  sent_to_print: "Naik Cetak",
};

export default function AdminAuditTrail({
  logs,
}: {
  logs: (ApprovalLog & {
    actor: { full_name: string; role: string };
    artwork: { title: string; status: string };
  })[];
}) {
  return (
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
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-ink/5 last:border-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-inkfaint">
                {format(new Date(log.signed_at), "d MMM yyyy HH:mm")}
              </td>
              <td className="px-4 py-3">{log.artwork?.title}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {ACTION_LABEL[log.action] ?? log.action}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{log.actor?.full_name}</td>
              <td className="px-4 py-3 text-xs text-inkfaint">{log.feedback_notes ?? "—"}</td>
            </tr>
          ))}
          {!logs.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-inkfaint">
                Belum ada aktivitas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
