"use client";

import { useMemo, useState } from "react";
import { Artwork } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import AdminArtworkControls from "./AdminArtworkControls";
import HistorySearchBar from "./HistorySearchBar";
import { filterAndSortHistory } from "@/lib/historyFilter";

const PAGE_SIZE = 4;

export default function ProductHistoryList({
  history,
  isAdmin,
}: {
  history: Artwork[];
  isAdmin?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  // Cari + urutkan dari yang terbaru (file dobel/mirip: versi terbaru di atas).
  const sorted = useMemo(() => filterAndSortHistory(history, query), [history, query]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  function changeQuery(v: string) {
    setQuery(v);
    setPage(0);
  }

  // Klik kartu membuka preview di tab baru. Klik pada tombol/link/input
  // di dalam kartu tidak ikut membuka preview.
  function openPreview(e: React.MouseEvent<HTMLDivElement>, artwork: Artwork) {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select, label")) return;
    window.open(`/preview/${artwork.id}`, "_blank", "noopener,noreferrer");
  }

  if (!history.length) {
    return (
      <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
        Belum ada riwayat review.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HistorySearchBar value={query} onChange={changeQuery} />

      {!sorted.length && (
        <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
          Tidak ada file yang cocok dengan pencarian.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {pageItems.map((artwork) => (
          <div key={artwork.id} className="flex flex-col gap-2">
            <div
              onClick={(e) => openPreview(e, artwork)}
              title="Klik untuk melihat preview file di tab baru"
              className="cursor-pointer"
            >
              <ArtworkTicket artwork={artwork} />
            </div>
            {isAdmin && <AdminArtworkControls artwork={artwork} />}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-xl border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink transition hover:border-ink disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="font-mono text-xs text-inkfaint">
            Halaman {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="rounded-xl border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink transition hover:border-ink disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}