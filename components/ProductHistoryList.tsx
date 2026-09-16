"use client";

import { useState } from "react";
import { Artwork } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import AdminArtworkControls from "./AdminArtworkControls";

const PAGE_SIZE = 4;

export default function ProductHistoryList({
  history,
  isAdmin,
}: {
  history: Artwork[];
  isAdmin?: boolean;
}) {
  const [page, setPage] = useState(0);

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  if (!sorted.length) {
    return (
      <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
        Belum ada riwayat review.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {pageItems.map((artwork) => (
          <div key={artwork.id} className="flex flex-col gap-2">
            <ArtworkTicket artwork={artwork} />
            {isAdmin && <AdminArtworkControls artwork={artwork} />}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
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