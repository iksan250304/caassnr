"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Artwork } from "@/lib/types";
import { BUCKET, getSignedUrl } from "@/lib/storage";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

export default function ArtworkPreviewModal({
  artwork,
  onClose,
}: {
  artwork: Artwork;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(600);
  const [downloading, setDownloading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Ambil link sementara ke file.
  useEffect(() => {
    let cancelled = false;
    getSignedUrl(artwork.file_url)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setError("File tidak ditemukan."));
    return () => {
      cancelled = true;
    };
  }, [artwork.file_url]);

  // Kunci scroll halaman di belakang modal + tutup dengan tombol Esc.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Lebar halaman PDF mengikuti lebar modal (penting di HP).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.min(900, el.clientWidth - 16)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      const dl = await getSignedUrl(
        artwork.file_url,
        3600,
        BUCKET,
        `${artwork.title} - v${artwork.version}.pdf`
      );
      window.open(dl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-4xl flex-col bg-white shadow-xl sm:h-[90vh] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Job No. {artwork.id.slice(0, 8)} · v{artwork.version}
            </p>
            <h3 className="truncate text-sm text-slate-900">{artwork.title}</h3>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading || !url}
              className="rounded-xl border border-slate-800 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              {downloading ? "Membuka…" : "Download"}
            </button>
            <button
              onClick={onClose}
              aria-label="Tutup preview"
              className="rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100"
            >
              Tutup
            </button>
          </div>
        </div>

        <div ref={boxRef} className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
          {error && <p className="p-6 text-center font-mono text-xs text-rose-600">{error}</p>}
          {!error && !url && (
            <p className="p-6 text-center font-mono text-xs text-slate-500">Memuat file…</p>
          )}
          {url && (
            <div className="mx-auto w-fit border border-slate-200 bg-white shadow-sm">
              <Document
                file={url}
                onLoadSuccess={(d) => {
                  setNumPages(d.numPages);
                  setPage(1);
                }}
                onLoadError={() => setError("Gagal memuat PDF.")}
                loading={
                  <p className="p-6 text-center font-mono text-xs text-slate-500">Memuat PDF…</p>
                }
              >
                <Page
                  pageNumber={page}
                  width={width}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-slate-200 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-600">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-30"
          >
            ← Hal
          </button>
          <span>
            {page} / {numPages || "…"}
          </span>
          <button
            disabled={page >= numPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-30"
          >
            Hal →
          </button>
        </div>
      </div>
    </div>
  );
}