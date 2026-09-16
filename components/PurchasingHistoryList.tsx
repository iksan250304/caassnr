"use client";

import { useMemo, useState } from "react";
import { Artwork, Category, CATEGORY_LABEL } from "@/lib/types";
import PurchasingItem from "./PurchasingItem";

export default function PurchasingHistoryList({
  history,
  isAdmin,
}: {
  history: Artwork[];
  isAdmin?: boolean;
}) {
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const filteredHistory = useMemo(
    () => (categoryFilter === "all" ? history : history.filter((a) => a.category === categoryFilter)),
    [history, categoryFilter]
  );

  const countByCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const a of history) map[a.category] = (map[a.category] ?? 0) + 1;
    return map;
  }, [history]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          style={
            categoryFilter === "all"
              ? { backgroundColor: "#1A1A1A", color: "#FFFFFF" }
              : { backgroundColor: "#FFFFFF", color: "#6B6B6B", borderColor: "rgba(26,26,26,0.2)" }
          }
          className="rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition"
        >
          Semua ({history.length})
        </button>
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
          const count = countByCategory[c] ?? 0;
          if (!count) return null;
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              style={
                categoryFilter === c
                  ? { backgroundColor: "#C8102E", color: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", color: "#6B6B6B", borderColor: "rgba(26,26,26,0.2)" }
              }
              className="rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition"
            >
              {CATEGORY_LABEL[c]} ({count})
            </button>
          );
        })}
      </div>

      {!filteredHistory.length && (
        <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
          {history.length ? "Tidak ada riwayat untuk kategori ini." : "Belum ada riwayat naik cetak."}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredHistory.map((artwork) => (
          <PurchasingItem key={artwork.id} artwork={artwork} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
}