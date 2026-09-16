"use client";

import { useState } from "react";
import { Artwork, ApprovalLog } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import UploadArtworkForm from "./UploadArtworkForm";
import { getSignedUrl } from "@/lib/storage";

type RevisionEntry = { artwork: Artwork; feedback?: ApprovalLog };
type SubmittedInfo = { name: string; at: string };

export default function RevisionQueueList({
  revisionQueue,
  submittedByMap,
}: {
  revisionQueue: RevisionEntry[];
  submittedByMap?: Record<string, SubmittedInfo>;
}) {
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

  if (!revisionQueue.length) {
    return (
      <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
        Tidak ada artwork yang perlu direvisi saat ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {revisionQueue.map(({ artwork, feedback }) => {
        const submittedBy = submittedByMap?.[artwork.id];
        return (
          <div key={artwork.id} className="flex flex-col gap-3">
            <ArtworkTicket artwork={artwork} />
            {submittedBy && (
              <p className="-mt-2 ml-1 font-mono text-[10px] uppercase tracking-wider text-inkfaint">
                Terakhir dikirim oleh: <span className="text-ink">{submittedBy.name}</span>
                {artwork.creator?.full_name && artwork.creator.full_name !== submittedBy.name && (
                  <> · Pengunggah asli: {artwork.creator.full_name}</>
                )}
              </p>
            )}
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
                <UploadArtworkForm mode="revise" artwork={artwork} onDone={() => setOpenId(null)} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}