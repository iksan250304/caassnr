"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl, uploadPdf } from "@/lib/storage";
import { Artwork } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function PurchasingItem({ artwork }: { artwork: Artwork }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    const url = await getSignedUrl(artwork.file_url);
    window.open(url, "_blank");
  }

  async function handleNaikCetak() {
    setError(null);
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

      const currentUrl = await getSignedUrl(artwork.file_url);
      const original = await fetch(currentUrl).then((r) => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(original);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width } = lastPage.getSize();
      const boxW = 220;
      const boxH = 64;
      const x = width - boxW - 24;
      const y = 24 + boxH + 8; // stack above the product-team stamp

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
      lastPage.drawText("NAIK CETAK — PURCHASING", {
        x: x + 10,
        y: y + boxH - 20,
        size: 10,
        font,
        color: rgb(0.7, 0.24, 0.18),
      });
      lastPage.drawText(profile?.full_name ?? "Tim Purchasing", {
        x: x + 10,
        y: y + boxH - 36,
        size: 10,
        font: fontRegular,
        color: rgb(0.08, 0.09, 0.11),
      });
      lastPage.drawText(format(new Date(), "d MMM yyyy HH:mm"), {
        x: x + 10,
        y: y + boxH - 50,
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
      });

      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Gagal memproses naik cetak.");
    } finally {
      setBusy(false);
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

      {error && (
        <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
          {error}
        </p>
      )}

      <div className="flex gap-2 border-t border-dashed border-ink/15 pt-3">
        <button
          onClick={handleDownload}
          className="border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof"
        >
          Unduh PDF Ber-TTD
        </button>
        {artwork.status === "approved_product" && (
          <button
            onClick={handleNaikCetak}
            disabled={busy}
            className="bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-paper hover:bg-proofdark disabled:opacity-50"
          >
            {busy ? "Memproses…" : "Naik Cetak"}
          </button>
        )}
      </div>
    </div>
  );
}
