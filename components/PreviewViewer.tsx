"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
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

export default function PreviewViewer({
  fileUrl,
  title,
  version,
  jobNo,
  downloadPath,
}: {
  fileUrl: string;
  title: string;
  version: number;
  jobNo: string;
  downloadPath: string | null;
}) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }
  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }

  // Pintasan keyboard: + / - zoom, panah kiri/kanan ganti halaman.
  // Ctrl+P (cetak) dan Ctrl+S (simpan) diblokir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "ArrowRight") setPage((p) => Math.min(numPages || 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages]);

  // Lebar dasar halaman PDF (zoom 100%) mengikuti lebar layar (penting di HP).
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
    if (!downloadPath) return;
    setDownloading(true);
    try {
      const dl = await getSignedUrl(downloadPath, 3600, BUCKET, `${title} - v${version}.pdf`);
      // Link unduhan: browser langsung mengunduh, halaman ini tetap terbuka.
      window.location.assign(dl);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="flex h-[100dvh] select-none flex-col bg-slate-100"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Kalau halaman dicetak, hasilnya kosong. */}
      <style>{`@media print { html, body { display: none !important; } }`}</style>

      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Job No. {jobNo} · v{version} · Hanya untuk dilihat
          </p>
          <h1 className="truncate text-sm text-slate-900">{title}</h1>
        </div>
        {downloadPath && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-shrink-0 rounded-xl border border-slate-800 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            {downloading ? "Membuka…" : "Download"}
          </button>
        )}
      </header>

      <div ref={boxRef} className="flex-1 overflow-auto p-2 sm:p-4">
        {error && <p className="p-6 text-center font-mono text-xs text-press">{error}</p>}
        {!error && (
          <div className="mx-auto w-fit border border-slate-200 bg-white shadow-sm">
            <Document
              file={fileUrl}
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

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200 bg-white px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-600">
        <div className="flex items-center gap-2">
          <button aria-label="Perkecil" disabled={zoom <= MIN_ZOOM} onClick={zoomOut} className={navBtn}>
            −
          </button>
          <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button aria-label="Perbesar" disabled={zoom >= MAX_ZOOM} onClick={zoomIn} className={navBtn}>
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
      </footer>
    </div>
  );
}