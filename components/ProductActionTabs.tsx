"use client";

import { useState } from "react";
import { Artwork } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";

export default function ProductActionTabs({
  queue,
  history,
}: {
  queue: Artwork[];
  history: Artwork[];
}) {
  const [tab, setTab] = useState<"antrean" | "riwayat">("antrean");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-ink/10">
        <button
          onClick={() => setTab("antrean")}
          className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition ${
            tab === "antrean"
              ? "border-b-2 border-amber text-amber"
              : "text-inkfaint hover:text-amber"
          }`}
        >
          Antrean Review
          {queue.length > 0 && (
            <span className="rounded-full bg-amber px-1.5 py-0.5 font-mono text-[10px] text-paper">
              {queue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("riwayat")}
          className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition ${
            tab === "riwayat"
              ? "border-b-2 border-ink text-ink"
              : "text-inkfaint hover:text-ink"
          }`}
        >
          Riwayat
          <span className="rounded-full bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] text-inkfaint">
            {history.length}
          </span>
        </button>
      </div>

      {tab === "antrean" && (
        <div className="flex flex-col gap-4">
          {!queue.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              Tidak ada artwork yang menunggu review.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {queue.map((artwork) => (
              <ArtworkTicket
                key={artwork.id}
                artwork={artwork}
                href={`/produk/${artwork.id}`}
                actionLabel="Review"
              />
            ))}
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
              <ArtworkTicket key={artwork.id} artwork={artwork} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
