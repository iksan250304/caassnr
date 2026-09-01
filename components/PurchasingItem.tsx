"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getSignedUrl,
  uploadPdf,
  uploadSignatureImage,
  validateSignatureImage,
  SIGNATURE_BUCKET,
} from "@/lib/storage";
import { Artwork } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import SignatureUploadField from "./SignatureUploadField";
import { format } from "date-fns";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { generateApprovalSheetPdf, SignerInfo } from "@/lib/generateApprovalSheet";

export default function PurchasingItem({ artwork }: { artwork: Artwork }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printingSheet, setPrintingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedSignaturePath, setSavedSignaturePath] = useState<string | null>(null);
  const [savedSignaturePreview, setSavedSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const isReadyToPrint = artwork.status === "approved_product";

  // Ambil TTD tersimpan milik user Purchasing yang login (kalau ada).
  useEffect(() => {
    if (!isReadyToPrint) return;
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
  }, [isReadyToPrint]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = await getSignedUrl(artwork.file_url);
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleNaikCetak() {
    setError(null);
    if (!signatureFile && !savedSignaturePath) {
      setError("Unggah gambar tanda tangan (PNG/JPG) sebelum Naik Cetak.");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Unggah/ganti TTD Purchasing kalau pilih file baru; kalau tidak, pakai yang tersimpan.
      let signaturePath = savedSignaturePath;
      if (signatureFile) {
        const sigError = validateSignatureImage(signatureFile);
        if (sigError) throw new Error(sigError);
        const ext = signatureFile.type === "image/png" ? "png" : "jpg";
        signaturePath = await uploadSignatureImage(`${user.id}/signature.${ext}`, signatureFile);
        await supabase.from("profiles").update({ signature_url: signaturePath }).eq("id", user.id);
      }

      const currentUrl = await getSignedUrl(artwork.file_url);
      const original = await fetch(currentUrl).then((r) => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(original);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width } = lastPage.getSize();
      const boxW = 220;
      const boxH = 96;
      const x = width - boxW - 24;
      const y = 24 + 64 + 8; // stack above the product-team stamp

      lastPage.drawRectangle({
        x,
        y,
        width: boxW,
        height: boxH,
        borderColor: rgb(0.7, 0.24, 0.18),
        borderWidth: 1.5,
        color: rgb(1, 1, 1),
        opacity: 0.92,
      });

      let cursorY = y + boxH - 20;

      const sigUrl = await getSignedUrl(signaturePath!, 3600, SIGNATURE_BUCKET);
      const sigBytes = await fetch(sigUrl).then((r) => r.arrayBuffer());
      const isPng = signaturePath!.endsWith(".png");
      const sigImage = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
      const dims = sigImage.scale(1);
      const maxImgW = boxW - 20;
      const maxImgH = 32;
      const scale = Math.min(maxImgW / dims.width, maxImgH / dims.height, 1);
      lastPage.drawImage(sigImage, {
        x: x + 10,
        y: cursorY - dims.height * scale + 8,
        width: dims.width * scale,
        height: dims.height * scale,
      });
      cursorY -= maxImgH + 8;

      lastPage.drawText("NAIK CETAK — PURCHASING", {
        x: x + 10,
        y: cursorY,
        size: 10,
        font,
        color: rgb(0.7, 0.24, 0.18),
      });
      lastPage.drawText(profile?.full_name ?? "Tim Purchasing", {
        x: x + 10,
        y: cursorY - 16,
        size: 10,
        font: fontRegular,
        color: rgb(0.08, 0.09, 0.11),
      });
      lastPage.drawText(format(new Date(), "d MMM yyyy HH:mm"), {
        x: x + 10,
        y: cursorY - 30,
        size: 8,
        font: fontRegular,
        color: rgb(0.34, 0.36, 0.39),
      });

      const stampedBytes = await pdfDoc.save();
      const finalPath = `${artwork.id}/v${artwork.version}-print-ready.pdf`;
      await uploadPdf(finalPath, new Blob([stampedBytes as BlobPart], { type: "application/pdf" }));

      const { error: updateError } = await supabase
        .from("artworks")
        .update({ status: "printed", file_url: finalPath })
        .eq("id", artwork.id);
      if (updateError) throw updateError;

      await supabase.from("approval_logs").insert({
        artwork_id: artwork.id,
        actor_id: user.id,
        action: "sent_to_print",
        annotated_pdf_url: finalPath,
        signature_url: signaturePath,
      });

      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Gagal memproses naik cetak.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCetakApproval() {
    setError(null);
    setPrintingSheet(true);
    try {
      const [{ data: submittedLog }, { data: approvedLog }, { data: printedLog }] =
        await Promise.all([
          supabase
            .from("approval_logs")
            .select("signature_url, signed_at, actor:actor_id(full_name)")
            .eq("artwork_id", artwork.id)
            .eq("action", "submitted")
            .order("signed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("approval_logs")
            .select("signature_url, signed_at, actor:actor_id(full_name)")
            .eq("artwork_id", artwork.id)
            .eq("action", "approved")
            .order("signed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("approval_logs")
            .select("signature_url, signed_at, actor:actor_id(full_name)")
            .eq("artwork_id", artwork.id)
            .eq("action", "sent_to_print")
            .order("signed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      async function toSignerInfo(log: any): Promise<SignerInfo> {
        const name = log?.actor?.full_name ?? "-";
        if (!log?.signature_url) return { name };
        try {
          const url = await getSignedUrl(log.signature_url, 3600, SIGNATURE_BUCKET);
          const bytes = await fetch(url).then((r) => r.arrayBuffer());
          return {
            name,
            signatureBytes: bytes,
            signatureExt: log.signature_url.endsWith(".jpg") ? "jpg" : "png",
          };
        } catch {
          return { name };
        }
      }

      const [design, produk, purchasing] = await Promise.all([
        toSignerInfo(submittedLog),
        toSignerInfo(approvedLog),
        toSignerInfo(printedLog),
      ]);

      const finalUrl = await getSignedUrl(artwork.file_url);
      const finalPdfBytes = await fetch(finalUrl).then((r) => r.arrayBuffer());

      const printDate = printedLog?.signed_at
        ? format(new Date(printedLog.signed_at), "d MMM yyyy HH:mm")
        : format(new Date(), "d MMM yyyy HH:mm");

      const sheetBytes = await generateApprovalSheetPdf({
        title: artwork.title,
        printDate,
        finalPdfBytes,
        design,
        produk,
        purchasing,
      });

      const sheetPath = `${artwork.id}/v${artwork.version}-approval-sheet.pdf`;
      await uploadPdf(sheetPath, new Blob([sheetBytes as BlobPart], { type: "application/pdf" }));
      const sheetUrl = await getSignedUrl(sheetPath);
      window.open(sheetUrl, "_blank");
    } catch (err: any) {
      setError(err.message ?? "Gagal membuat lembar approval.");
    } finally {
      setPrintingSheet(false);
    }
  }

  return (
    <div className="regmark ticket flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
            Job No. {artwork.id.slice(0, 8)} · v{artwork.version}
          </p>
          <h3 className="mt-1 font-display text-base leading-tight">{artwork.title}</h3>
        </div>
        <StatusBadge status={artwork.status} />
      </div>
      <p className="font-mono text-[11px] text-inkfaint">
        Diajukan oleh {artwork.creator?.full_name}
      </p>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="self-start border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof disabled:opacity-50"
      >
        {downloading ? "Membuka…" : "Unduh PDF (Sudah ACC Produk)"}
      </button>

      {isReadyToPrint && (
        <div className="flex flex-col gap-2 border-t border-dashed border-ink/15 pt-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
            TTD Digital Purchasing (wajib sebelum Naik Cetak)
          </span>
          <SignatureUploadField
            file={signatureFile}
            savedPreviewUrl={savedSignaturePreview}
            onFileChange={setSignatureFile}
          />
        </div>
      )}

      {error && (
        <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
          {error}
        </p>
      )}

      {artwork.status === "printed" && (
        <button
          onClick={handleCetakApproval}
          disabled={printingSheet}
          className="self-start border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {printingSheet ? "Menyusun Lembar…" : "Cetak Lembar Approval"}
        </button>
      )}

      {isReadyToPrint && (
        <button
          onClick={handleNaikCetak}
          disabled={busy}
          className="bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-paper hover:bg-proofdark disabled:opacity-50"
        >
          {busy ? "Memproses…" : "Naik Cetak"}
        </button>
      )}
    </div>
  );
}
