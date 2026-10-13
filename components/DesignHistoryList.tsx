"use client";

import { useMemo, useState } from "react";
import { Artwork, ApprovalLog } from "@/lib/types";
import DesignArtworkItem from "./DesignArtworkItem";
import HistorySearchBar from "./HistorySearchBar";
import { filterAndSortHistory } from "@/lib/historyFilter";

const PAGE_SIZE = 4;

export default function DesignHistoryList({
  history,
  feedbackMap,
  submittedByMap,
  isAdmin,
}: {
  history: Artwork[];
  feedbackMap: Record<string, ApprovalLog>;
  submittedByMap: Record<string, { name: string; at: string }>;
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

  if (!history.length) {
    return (
      <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
        Belum ada artwork yang diajukan.
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

      {pageItems.map((artwork) => (
        <DesignArtworkItem
          key={artwork.id}
          artwork={artwork}
          latestFeedback={feedbackMap[artwork.id]}
          isAdmin={isAdmin}
          submittedBy={submittedByMap[artwork.id]}
        />
      ))}

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