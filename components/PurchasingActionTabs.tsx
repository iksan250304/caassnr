"use client";

import { useMemo, useState } from "react";
import { Artwork, Category, CATEGORY_LABEL } from "@/lib/types";
import PurchasingItem from "./PurchasingItem";

export default function PurchasingActionTabs({
  ready,
  history,
  isAdmin,
}: {
  ready: Artwork[];
  history: Artwork[];
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"siap" | "riwayat">("siap");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const filteredHistory = useMemo(
    () =>
      categoryFilter === "all" ? history : history.filter((a) => a.category === categoryFilter),
    [history, categoryFilter]
  );

  const countByCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const a of history) map[a.category] = (map[a.category] ?? 0) + 1;
    return map;
  }, [history]);

  return (
    <div className="flex flex-col gap-4">
      {/* Inline style langsung, bukan cuma class Tailwind, biar kontras selalu aman
          walau cache/build sempat stale. */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("siap")}
          style={
            tab === "siap"
              ? { backgroundColor: "#2F6F4F", color: "#FFFFFF", borderColor: "#2F6F4F" }
              : { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "rgba(26,26,26,0.2)" }
          }
          className="flex items-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-wider transition"
        >
          Siap Cetak
          {ready.length > 0 && (
            <span
              style={
                tab === "siap"
                  ? { backgroundColor: "rgba(255,255,255,0.3)", color: "#FFFFFF" }
                  : { backgroundColor: "#2F6F4F", color: "#FFFFFF" }
              }
              className="rounded-full px-1.5 py-0.5 text-[10px]"
            >
              {ready.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("riwayat")}
          style={
            tab === "riwayat"
              ? { backgroundColor: "#1A1A1A", color: "#FFFFFF", borderColor: "#1A1A1A" }
              : { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "rgba(26,26,26,0.2)" }
          }
          className="flex items-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-wider transition"
        >
          Riwayat Naik Cetak
          <span
            style={
              tab === "riwayat"
                ? { backgroundColor: "rgba(255,255,255,0.3)", color: "#FFFFFF" }
                : { backgroundColor: "rgba(26,26,26,0.1)", color: "#1A1A1A" }
            }
            className="rounded-full px-1.5 py-0.5 text-[10px]"
          >
            {history.length}
          </span>
        </button>
      </div>

      {tab === "siap" && (
        <div className="flex flex-col gap-4">
          {!ready.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              Belum ada artwork yang disetujui tim produk.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {ready.map((artwork) => (
              <PurchasingItem key={artwork.id} artwork={artwork} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      )}

      {tab === "riwayat" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              style={
                categoryFilter === "all"
                  ? { backgroundColor: "#1A1A1A", color: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", color: "#6B6B6B", borderColor: "rgba(26,26,26,0.2)" }
              }
              className="border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition"
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
                  className="border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition"
                >
                  {CATEGORY_LABEL[c]} ({count})
                </button>
              );
            })}
          </div>

          {!filteredHistory.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              {history.length
                ? "Tidak ada riwayat untuk kategori ini."
                : "Belum ada riwayat naik cetak."}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredHistory.map((artwork) => (
              <PurchasingItem key={artwork.id} artwork={artwork} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}