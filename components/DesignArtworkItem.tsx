"use client";

import { useState } from "react";
import { Artwork, ApprovalLog } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import AdminArtworkControls from "./AdminArtworkControls";
import { getSignedUrl } from "@/lib/storage";

export default function DesignArtworkItem({
  artwork,
  latestFeedback,
  isAdmin,
  submittedBy,
}: {
  artwork: Artwork;
  latestFeedback?: ApprovalLog;
  isAdmin?: boolean;
  submittedBy?: { name: string; at: string };
}) {
  const [openingMarkup, setOpeningMarkup] = useState(false);

  async function handleViewMarkup() {
    if (!latestFeedback?.annotated_pdf_url) return;
    setOpeningMarkup(true);
    try {
      const url = await getSignedUrl(latestFeedback.annotated_pdf_url);
      window.open(url, "_blank");
    } finally {
      setOpeningMarkup(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ArtworkTicket artwork={artwork} />

      {submittedBy && (
        <p className="-mt-2 ml-1 font-mono text-[10px] uppercase tracking-wider text-inkfaint">
          Terakhir dikirim (v{artwork.version}) oleh: <span className="text-ink">{submittedBy.name}</span>
          {artwork.creator?.full_name && artwork.creator.full_name !== submittedBy.name && (
            <> · Pengunggah asli: {artwork.creator.full_name}</>
          )}
        </p>
      )}

      {isAdmin && <AdminArtworkControls artwork={artwork} />}

      {artwork.status === "rejected_product" && (
        <div className="ml-1 flex flex-col gap-2 border-l-2 border-press/40 pl-4">
          {latestFeedback?.feedback_notes && (
            <p className="whitespace-pre-line font-mono text-xs text-press">
              Catatan revisi: {latestFeedback.feedback_notes}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {latestFeedback?.annotated_pdf_url && (
              <button
                onClick={handleViewMarkup}
                disabled={openingMarkup}
                className="self-start border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof disabled:opacity-50"
              >
                {openingMarkup ? "Membuka…" : "Lihat Coretan Tim Produk"}
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider text-inkfaint">
              Unggah revisi lewat tab &quot;Revisi&quot; di atas ↑
            </span>
          </div>
        </div>
      )}
    </div>
  );
}