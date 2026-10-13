"use client";

import { useMemo, useState } from "react";
import { Artwork, Category, CATEGORY_LABEL } from "@/lib/types";
import PurchasingItem from "./PurchasingItem";
import HistorySearchBar from "./HistorySearchBar";
import Pagination from "./Pagination";
import { filterAndSortHistory } from "@/lib/historyFilter";

const PAGE_SIZE = 4;

export default function PurchasingHistoryList({
  history,
  isAdmin,
}: {
  history: Artwork[];
  isAdmin?: boolean;
}) {
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Filter kategori dulu, lalu cari + urutkan dari yang terbaru.
  const filteredHistory = useMemo(() => {
    const byCategory =
      categoryFilter === "all" ? history : history.filter((a) => a.category === categoryFilter);
    return filterAndSortHistory(byCategory, query);
  }, [history, categoryFilter, query]);

  const countByCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const a of history) map[a.category] = (map[a.category] ?? 0) + 1;
    return map;
  }, [history]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedHistory = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function changeCategory(c: Category | "all") {
    setCategoryFilter(c);
    setPage(1);
  }

  function changeQuery(v: string) {
    setQuery(v);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <HistorySearchBar value={query} onChange={changeQuery} />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => changeCategory("all")}
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
              onClick={() => changeCategory(c)}
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
          {!history.length
            ? "Belum ada riwayat naik cetak."
            : query
            ? "Tidak ada file yang cocok dengan pencarian."
            : "Tidak ada riwayat untuk kategori ini."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {pagedHistory.map((artwork) => (
          <PurchasingItem key={artwork.id} artwork={artwork} isAdmin={isAdmin} />
        ))}
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}