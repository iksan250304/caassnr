"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Artwork } from "@/lib/types";
import { BUCKET, getSignedUrl } from "@/lib/storage";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

const navBtn =
  "rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-30";

export default function ArtworkPreviewModal({
  artwork,
  onClose,
  filePath,
  allowDownload = true,
}: {
  artwork: Artwork;
  onClose: () => void;
  filePath?: string;
  allowDownload?: boolean;
}) {
  // Kalau filePath diberikan, file itu yang dipratinjau (mis. file bersih untuk vendor).
  const path = filePath ?? artwork.file_url;

  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }
  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }

  // Ambil link sementara ke file.
  useEffect(() => {
    let cancelled = false;
    getSignedUrl(path)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setError("File tidak ditemukan."));
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Kunci scroll halaman di belakang modal + pintasan keyboard:
  // Esc = tutup, + / = perbesar, - perkecil.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
      }
      if (e.key === "-") {
        setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Lebar dasar halaman PDF (zoom 100%) mengikuti lebar modal (penting di HP).
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
        path,
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
            {allowDownload && (
              <button
                onClick={handleDownload}
                disabled={downloading || !url}
                className="rounded-xl border border-slate-800 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                {downloading ? "Membuka…" : "Download"}
              </button>
            )}
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
                  width={Math.round(width * zoom)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-600">
          <div className="flex items-center gap-2">
            <button
              aria-label="Perkecil"
              disabled={zoom <= MIN_ZOOM}
              onClick={zoomOut}
              className={navBtn}
            >
              −
            </button>
            <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              aria-label="Perbesar"
              disabled={zoom >= MAX_ZOOM}
              onClick={zoomIn}
              className={navBtn}
            >
              +
            </button>
            {zoom !== 1 && (
              <button onClick={() => setZoom(1)} className={navBtn}>
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={navBtn}>
              ← Hal
            </button>
            <span>
              {page} / {numPages || "…"}
            </span>
            <button
              disabled={page >= numPages}
              onClick={() => setPage((p) => p + 1)}
              className={navBtn}
            >
              Hal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}