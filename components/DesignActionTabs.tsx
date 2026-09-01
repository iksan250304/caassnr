"use client";

import { useState } from "react";
import { Artwork, ApprovalLog } from "@/lib/types";
import UploadArtworkForm from "./UploadArtworkForm";
import ArtworkTicket from "./ArtworkTicket";
import DesignArtworkItem from "./DesignArtworkItem";
import { getSignedUrl } from "@/lib/storage";

type RevisionEntry = { artwork: Artwork; feedback?: ApprovalLog };

export default function DesignActionTabs({
  revisionQueue,
  history,
  feedbackMap,
  isAdmin,
}: {
  revisionQueue: RevisionEntry[];
  history: Artwork[];
  feedbackMap: Record<string, ApprovalLog>;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"upload" | "revisi" | "riwayat">("upload");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openingMarkupId, setOpeningMarkupId] = useState<string | null>(null);

  async function handleViewMarkup(feedback?: ApprovalLog) {
    if (!feedback?.annotated_pdf_url) return;
    setOpeningMarkupId(feedback.id);
    try {
      const url = await getSignedUrl(feedback.annotated_pdf_url);
      window.open(url, "_blank");
    } finally {
      setOpeningMarkupId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-ink/10">
        <button
          onClick={() => setTab("upload")}
          className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition ${
            tab === "upload"
              ? "border-b-2 border-ink text-ink"
              : "text-inkfaint hover:text-ink"
          }`}
        >
          Upload Baru
        </button>
        <button
          onClick={() => setTab("revisi")}
          className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition ${
            tab === "revisi"
              ? "border-b-2 border-press text-press"
              : "text-inkfaint hover:text-press"
          }`}
        >
          Revisi
          {revisionQueue.length > 0 && (
            <span className="rounded-full bg-press px-1.5 py-0.5 font-mono text-[10px] text-paper">
              {revisionQueue.length}
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
          Riwayat Pengajuan
          <span className="rounded-full bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] text-inkfaint">
            {history.length}
          </span>
        </button>
      </div>

      {tab === "upload" && <UploadArtworkForm mode="create" />}

      {tab === "revisi" && (
        <div className="flex flex-col gap-4">
          {!revisionQueue.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              Tidak ada artwork yang perlu direvisi saat ini.
            </p>
          )}
          {revisionQueue.map(({ artwork, feedback }) => (
            <div key={artwork.id} className="flex flex-col gap-3">
              <ArtworkTicket artwork={artwork} />
              <div className="ml-1 flex flex-col gap-3 border-l-2 border-press/40 pl-4">
                {feedback?.feedback_notes && (
                  <p className="whitespace-pre-line font-mono text-xs text-press">
                    Catatan revisi: {feedback.feedback_notes}
                  </p>
                )}
                {feedback?.annotated_pdf_url && (
                  <button
                    onClick={() => handleViewMarkup(feedback)}
                    disabled={openingMarkupId === feedback.id}
                    className="self-start border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof disabled:opacity-50"
                  >
                    {openingMarkupId === feedback.id ? "Membuka…" : "Lihat Coretan Tim Produk"}
                  </button>
                )}
                {openId !== artwork.id ? (
                  <button
                    onClick={() => setOpenId(artwork.id)}
                    className="self-start border border-press/40 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-press hover:bg-press/5"
                  >
                    Revisi Sekarang
                  </button>
                ) : (
                  <UploadArtworkForm
                    mode="revise"
                    artwork={artwork}
                    onDone={() => setOpenId(null)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "riwayat" && (
        <div className="flex flex-col gap-4">
          {!history.length && (
            <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
              Belum ada artwork yang diajukan.
            </p>
          )}
          {history.map((artwork) => (
            <DesignArtworkItem
              key={artwork.id}
              artwork={artwork}
              latestFeedback={feedbackMap[artwork.id]}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
