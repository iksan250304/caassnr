"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Artwork, ApprovalLog } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import { getSignedUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export default function DesignArtworkItem({
  artwork,
  latestFeedback,
  isAdmin,
}: {
  artwork: Artwork;
  latestFeedback?: ApprovalLog;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [openingMarkup, setOpeningMarkup] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleDelete() {
    if (!confirm(`Hapus artwork "${artwork.title}"? Tindakan tidak dapat dibatalkan.`)) return;
    setDeleting(true);
    setError(null);
    const { error } = await supabase.from("artworks").delete().eq("id", artwork.id);
    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ArtworkTicket artwork={artwork} />

      {isAdmin && (
        <div className="flex items-center gap-3">
          {artwork.status === "printed" ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-inkfaint">
              Terkunci (sudah naik cetak, tidak bisa dihapus)
            </span>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="font-mono text-[10px] uppercase tracking-wider text-press hover:underline disabled:opacity-50"
            >
              {deleting ? "Menghapus…" : "Hapus Artwork (Admin)"}
            </button>
          )}
          {error && <span className="font-mono text-[10px] text-press">{error}</span>}
        </div>
      )}

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
