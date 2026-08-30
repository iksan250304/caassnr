"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadPdf } from "@/lib/storage";
import { Artwork } from "@/lib/types";
import PdfReviewer, { PdfReviewerHandle } from "./PdfReviewer";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";

export default function ProductReviewClient({
  artwork,
  signedUrl,
  reviewer,
}: {
  artwork: Artwork;
  signedUrl: string;
  reviewer: { name: string; role: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const reviewerHandle = useRef<PdfReviewerHandle>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alreadyDecided = artwork.status !== "pending_product";

  async function handleApprove() {
    setError(null);
    setBusy("approve");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      const dateText = format(new Date(), "d MMM yyyy HH:mm");
      const bytes = await reviewerHandle.current!.exportStampedPdf({
        label: "DISETUJUI — TIM PRODUK",
        name: reviewer.name,
        role: "Tim Produk",
        dateText,
      });

      const stampedPath = `${artwork.id}/v${artwork.version}-approved.pdf`;
      await uploadPdf(stampedPath, new Blob([bytes as BlobPart], { type: "application/pdf" }));

      const { error: updateError } = await supabase
        .from("artworks")
        .update({ status: "approved_product", file_url: stampedPath })
        .eq("id", artwork.id);
      if (updateError) throw updateError;

      await supabase.from("approval_logs").insert({
        artwork_id: artwork.id,
        actor_id: user.id,
        action: "approved",
        feedback_notes: feedback || null,
        annotated_pdf_url: stampedPath,
      });

      router.push("/produk");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyetujui artwork.");
      setBusy(null);
    }
  }

  async function handleReject() {
    setError(null);
    if (!feedback.trim()) {
      setError("Tuliskan catatan revisi sebelum menolak artwork.");
      return;
    }
    setBusy("reject");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      const bytes = await reviewerHandle.current!.exportStampedPdf();
      const markupPath = `${artwork.id}/v${artwork.version}-markup.pdf`;
      await uploadPdf(markupPath, new Blob([bytes as BlobPart], { type: "application/pdf" }));

      const { error: updateError } = await supabase
        .from("artworks")
        .update({ status: "rejected_product" })
        .eq("id", artwork.id);
      if (updateError) throw updateError;

      await supabase.from("approval_logs").insert({
        artwork_id: artwork.id,
        actor_id: user.id,
        action: "rejected",
        feedback_notes: feedback,
        annotated_pdf_url: markupPath,
      });

      router.push("/produk");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Gagal menolak artwork.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex-1">
        {signedUrl ? (
          <PdfReviewer ref={reviewerHandle} fileUrl={signedUrl} />
        ) : (
          <p className="font-mono text-xs text-press">File tidak ditemukan.</p>
        )}
      </div>

      <aside className="ticket regmark flex w-full flex-col gap-4 p-5 lg:sticky lg:top-6 lg:w-80">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
            Job No. {artwork.id.slice(0, 8)} · v{artwork.version}
          </p>
          <h2 className="mt-1 font-display text-lg leading-tight">{artwork.title}</h2>
          <div className="mt-2">
            <StatusBadge status={artwork.status} />
          </div>
        </div>

        {artwork.description && (
          <p className="text-sm text-inkfaint">{artwork.description}</p>
        )}

        <p className="font-mono text-[11px] text-inkfaint">
          Diajukan oleh {artwork.creator?.full_name}
        </p>

        {!alreadyDecided ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
                Catatan (wajib bila menolak)
              </span>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
                placeholder="Contoh: Warna logo kurang kontras, geser posisi barcode 2mm ke kanan."
              />
            </label>

            {error && (
              <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleApprove}
                disabled={busy !== null}
                className="bg-approve py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition hover:opacity-90 disabled:opacity-50"
              >
                {busy === "approve" ? "Membubuhkan TTD…" : "ACC & Bubuhkan TTD Digital"}
              </button>
              <button
                onClick={handleReject}
                disabled={busy !== null}
                className="border border-press py-2.5 font-mono text-xs uppercase tracking-widest text-press transition hover:bg-press/5 disabled:opacity-50"
              >
                {busy === "reject" ? "Mengirim…" : "Tolak & Kirim Revisi"}
              </button>
            </div>
          </>
        ) : (
          <p className="font-mono text-xs text-inkfaint">
            Dokumen ini sudah diputuskan sebelumnya.
          </p>
        )}
      </aside>
    </div>
  );
}
