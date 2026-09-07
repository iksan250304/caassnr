"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPdf,
  uploadSignatureImage,
  getSignedUrl,
  validateSignatureImage,
  SIGNATURE_BUCKET,
} from "@/lib/storage";
import { Artwork } from "@/lib/types";
import PdfReviewer, { PdfReviewerHandle } from "./PdfReviewer";
import StatusBadge from "./StatusBadge";
import SignatureUploadField from "./SignatureUploadField";
import { format } from "date-fns";
import { notifyRole, notifyUser } from "@/lib/notifications";

export default function ProductReviewClient({
  artwork,
  signedUrl,
  reviewer,
  returnedByPurchasing,
}: {
  artwork: Artwork;
  signedUrl: string;
  reviewer: { name: string; role: string };
  returnedByPurchasing?: { actorName: string; note: string } | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const reviewerHandle = useRef<PdfReviewerHandle>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [savedSignaturePath, setSavedSignaturePath] = useState<string | null>(null);
  const [savedSignaturePreview, setSavedSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const alreadyDecided = artwork.status !== "pending_product";

  // Ambil TTD tersimpan milik user Produk yang login (kalau ada).
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("signature_url")
        .eq("id", user.id)
        .single();
      if (profile?.signature_url) {
        setSavedSignaturePath(profile.signature_url);
        try {
          const url = await getSignedUrl(profile.signature_url, 3600, SIGNATURE_BUCKET);
          setSavedSignaturePreview(url);
        } catch {
          // file mungkin sudah dihapus manual; abaikan
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = await getSignedUrl(artwork.file_url);
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleApprove() {
    setError(null);
    if (!signatureFile && !savedSignaturePath) {
      setError("Unggah gambar tanda tangan (PNG/JPG) sebelum ACC.");
      return;
    }
    setBusy("approve");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      // Unggah/ganti TTD Produk kalau pilih file baru; kalau tidak, pakai yang tersimpan.
      let signaturePath = savedSignaturePath;
      if (signatureFile) {
        const sigError = validateSignatureImage(signatureFile);
        if (sigError) throw new Error(sigError);
        const ext = signatureFile.type === "image/png" ? "png" : "jpg";
        signaturePath = await uploadSignatureImage(`${user.id}/signature.${ext}`, signatureFile);
        await supabase.from("profiles").update({ signature_url: signaturePath }).eq("id", user.id);
      }

      const dateText = format(new Date(), "d MMM yyyy HH:mm");

      // Gambar TTD Produk sendiri, ikut dibubuhkan ke stempel ACC di kanan bawah.
      const sigUrl = await getSignedUrl(signaturePath!, 3600, SIGNATURE_BUCKET);
      const sigBytes = await fetch(sigUrl).then((r) => r.arrayBuffer());
      const signatureImage = {
        imageBytes: sigBytes,
        imageType: (signaturePath!.endsWith(".jpg") ? "jpg" : "png") as "jpg" | "png",
      };

      // Ambil TTD gambar Design dari log "submitted" terbaru untuk artwork ini, supaya
      // TTD Design ikut terbawa ke dokumen final yang nanti dicetak Purchasing.
      let designSignoff:
        | { imageBytes: ArrayBuffer; imageType: "png" | "jpg"; name: string; dateText: string }
        | undefined;
      const { data: submittedLog } = await supabase
        .from("approval_logs")
        .select("signature_url, signed_at")
        .eq("artwork_id", artwork.id)
        .eq("action", "submitted")
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (submittedLog?.signature_url) {
        try {
          const designSigUrl = await getSignedUrl(
            submittedLog.signature_url,
            3600,
            SIGNATURE_BUCKET
          );
          const imageBytes = await fetch(designSigUrl).then((r) => r.arrayBuffer());
          designSignoff = {
            imageBytes,
            imageType: submittedLog.signature_url.endsWith(".jpg") ? "jpg" : "png",
            name: artwork.creator?.full_name ?? "Tim Design",
            dateText: format(new Date(submittedLog.signed_at), "d MMM yyyy HH:mm"),
          };
        } catch {
          // gambar TTD tidak ditemukan/rusak; lanjut tanpa signoff gambar
        }
      }

      const bytes = await reviewerHandle.current!.exportStampedPdf(
        {
          label: "DISETUJUI — TIM PRODUK",
          name: reviewer.name,
          role: "Tim Produk",
          dateText,
          signatureImage,
        },
        designSignoff
      );

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
        signature_url: signaturePath,
      });

      await notifyRole(
        "purchasing",
        "ready_to_print",
        `${reviewer.name} menyetujui artwork: ${artwork.title}`,
        artwork.id
      );

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

      await notifyUser(
        artwork.created_by,
        "revision_needed",
        `${reviewer.name} meminta revisi untuk: ${artwork.title}`,
        artwork.id
      );

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

        {returnedByPurchasing && (
          <div className="border border-press bg-press/5 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-press">
              ↩ Dikembalikan oleh Purchasing
            </p>
            <p className="mt-1 text-sm text-ink">{returnedByPurchasing.note}</p>
            <p className="mt-1 font-mono text-[10px] text-inkfaint">
              — {returnedByPurchasing.actorName}
            </p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="self-start border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof disabled:opacity-50"
        >
          {downloading ? "Membuka…" : "Unduh PDF dari Design"}
        </button>

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

            <div className="flex flex-col gap-2 border-t border-dashed border-ink/15 pt-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
                TTD Digital (wajib bila ACC)
              </span>
              <SignatureUploadField
                file={signatureFile}
                savedPreviewUrl={savedSignaturePreview}
                onFileChange={setSignatureFile}
              />
            </div>

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