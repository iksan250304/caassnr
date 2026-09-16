"use client";

import { useState } from "react";
import { ApprovalLog } from "@/lib/types";
import { format } from "date-fns";

const ACTION_LABEL: Record<string, string> = {
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  sent_to_print: "Naik Cetak",
  returned_by_purchasing: "Dikembalikan Purchasing",
};

const PAGE_SIZE = 4;

type LogRow = ApprovalLog & {
  actor: { full_name: string; role: string };
  artwork: { title: string; status: string };
};

export default function AdminAuditTrail({ logs }: { logs: LogRow[] }) {
  const [page, setPage] = useState(0);

  const sorted = [...logs].sort(
    (a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
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
            {pageItems.map((log) => (
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
            {!pageItems.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-inkfaint">
                  Belum ada aktivitas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-xl border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink transition hover:border-ink disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="font-mono text-xs text-inkfaint">
            Halaman {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-xl border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink transition hover:border-ink disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}