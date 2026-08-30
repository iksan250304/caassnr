"use client";

import { useState } from "react";
import { Artwork, ApprovalLog } from "@/lib/types";
import ArtworkTicket from "./ArtworkTicket";
import UploadArtworkForm from "./UploadArtworkForm";

export default function DesignArtworkItem({
  artwork,
  latestFeedback,
}: {
  artwork: Artwork;
  latestFeedback?: ApprovalLog;
}) {
  const [showRevise, setShowRevise] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <ArtworkTicket artwork={artwork} />

      {artwork.status === "rejected_product" && (
        <div className="ml-1 flex flex-col gap-3 border-l-2 border-press/40 pl-4">
          {latestFeedback?.feedback_notes && (
            <p className="font-mono text-xs text-press">
              Catatan revisi: {latestFeedback.feedback_notes}
            </p>
          )}
          {!showRevise ? (
            <button
              onClick={() => setShowRevise(true)}
              className="self-start border border-press/40 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-press hover:bg-press/5"
            >
              Unggah Revisi
            </button>
          ) : (
            <UploadArtworkForm
              mode="revise"
              artwork={artwork}
              onDone={() => setShowRevise(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
