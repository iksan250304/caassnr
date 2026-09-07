"use client";

import { useMemo, useState } from "react";
import { Artwork, ApprovalLog, Category, CATEGORY_LABEL } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import AdminArtworkControls from "./AdminArtworkControls";

export default function ProductActionTabs({
  queue,
  history,
  isAdmin,
  returnedMap,
}: {
  queue: Artwork[];
  history: Artwork[];
  isAdmin?: boolean;
  returnedMap?: Record<string, ApprovalLog>;
}) {
  const [tab, setTab] = useState<"antrean" | "riwayat">("antrean");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const filteredQueue = useMemo(
    () => (categoryFilter === "all" ? queue : queue.filter((a) => a.category === categoryFilter)),
    [queue, categoryFilter]
  );

  const countByCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const a of queue) map[a.category] = (map[a.category] ?? 0) + 1;
    return map;
  }, [queue]);

  return (
    <div className="flex flex-col gap-4">
      {/* Solid pill tabs — pakai inline style langsung (bukan cuma class Tailwind)
          supaya kontras tetap terjamin meski cache/build sempat stale */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("antrean")}
          style={
            tab === "antrean"
              ? { backgroundColor: "#B8791E", color: "#FFFFFF", borderColor: "#B8791E" }
              : { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "rgba(26,26,26,0.2)" }
          }
          className="flex items-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-wider transition"
        >
          Antrean Review
          {queue.length > 0 && (
            <span
              style={
                tab === "antrean"
                  ? { backgroundColor: "rgba(255,255,255,0.3)", color: "#FFFFFF" }
                  : { backgroundColor: "#B8791E", color: "#FFFFFF" }
              }
              className="rounded-full px-1.5 py-0.5 text-[10px]"
            >
              {queue.length}
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
          Riwayat
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

      {tab === "antrean" && (
        <div className="flex flex-col gap-4">
          {/* Filter kategori — supaya bisa langsung lihat "tim design kirim apa saja" per kategori */}
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
              Semua ({queue.length})
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

          {!filteredQueue.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              {queue.length
                ? "Tidak ada artwork untuk kategori ini."
                : "Tidak ada artwork yang menunggu review."}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredQueue.map((artwork) => {
              const returned = returnedMap?.[artwork.id];
              return (
                <div key={artwork.id} className="flex flex-col gap-2">
                  {returned && (
                    <p className="border border-press/40 bg-press/5 px-3 py-2 font-mono text-[11px] text-press">
                      ↩ Dikembalikan Purchasing ({(returned as any).actor?.full_name ?? "Purchasing"}):{" "}
                      {returned.feedback_notes}
                    </p>
                  )}
                  <ArtworkTicket
                    artwork={artwork}
                    href={`/produk/${artwork.id}`}
                    actionLabel="Review"
                  />
                  {isAdmin && <AdminArtworkControls artwork={artwork} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "riwayat" && (
        <div className="flex flex-col gap-4">
          {!history.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              Belum ada riwayat review.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {history.map((artwork) => (
              <div key={artwork.id} className="flex flex-col gap-2">
                <ArtworkTicket artwork={artwork} />
                {isAdmin && <AdminArtworkControls artwork={artwork} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}