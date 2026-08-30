"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PdfReviewerHandle {
  /**
   * Flattens any freehand markup onto the PDF and, if a stamp is provided,
   * burns a signature stamp box onto the last page. Returns the resulting
   * PDF bytes ready to upload.
   */
  exportStampedPdf: (stamp?: {
    label: string;
    name: string;
    role: string;
    dateText: string;
  }) => Promise<Uint8Array>;
  hasMarkup: () => boolean;
}

const PAGE_WIDTH = 720;

const PdfReviewer = forwardRef<PdfReviewerHandle, { fileUrl: string }>(
  function PdfReviewer({ fileUrl }, ref) {
    const [numPages, setNumPages] = useState(0);
    const [pageIndex, setPageIndex] = useState(1);
    const [drawing, setDrawing] = useState(false);
    const [pageSize, setPageSize] = useState({ width: PAGE_WIDTH, height: 960 });
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // dataURL snapshot of each page's markup layer, keyed by page number
    const pageDrawings = useRef<Record<number, string>>({});

    const saveCurrentCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const blank = document.createElement("canvas");
      blank.width = canvas.width;
      blank.height = canvas.height;
      if (canvas.toDataURL() !== blank.toDataURL()) {
        pageDrawings.current[pageIndex] = canvas.toDataURL("image/png");
      }
    }, [pageIndex]);

    const restoreCanvasForPage = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const saved = pageDrawings.current[pageIndex];
      if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = saved;
      }
    }, [pageIndex]);

    // whenever the visible page (or its rendered size) changes, repaint the markup layer
    useEffect(() => {
      restoreCanvasForPage();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex, pageSize.width, pageSize.height]);

    function goToPage(next: number) {
      saveCurrentCanvas();
      setPageIndex(next);
    }

    function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
      setDrawing(true);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = pointerPos(e);
      ctx.strokeStyle = "#B23A2E";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = pointerPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function endDraw() {
      if (drawing) saveCurrentCanvas();
      setDrawing(false);
    }

    function clearPage() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      delete pageDrawings.current[pageIndex];
    }

    useImperativeHandle(ref, () => ({
      hasMarkup: () => Object.keys(pageDrawings.current).length > 0,
      exportStampedPdf: async (stamp) => {
        saveCurrentCanvas();
        const original = await fetch(fileUrl).then((r) => r.arrayBuffer());
        const pdfDoc = await PDFDocument.load(original);
        const pages = pdfDoc.getPages();

        for (const [pageNumStr, dataUrl] of Object.entries(pageDrawings.current)) {
          const pageNum = Number(pageNumStr);
          const page = pages[pageNum - 1];
          if (!page) continue;
          const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
          const pngImage = await pdfDoc.embedPng(pngBytes);
          const { width, height } = page.getSize();
          page.drawImage(pngImage, { x: 0, y: 0, width, height });
        }

        if (stamp) {
          const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const lastPage = pages[pages.length - 1];
          const { width } = lastPage.getSize();
          const boxW = 220;
          const boxH = 64;
          const x = width - boxW - 24;
          const y = 24;

          lastPage.drawRectangle({
            x,
            y,
            width: boxW,
            height: boxH,
            borderColor: rgb(0.11, 0.31, 0.54),
            borderWidth: 1.5,
            color: rgb(1, 1, 1),
            opacity: 0.92,
          });
          lastPage.drawText(stamp.label, {
            x: x + 10,
            y: y + boxH - 20,
            size: 11,
            font,
            color: rgb(0.11, 0.31, 0.54),
          });
          lastPage.drawText(stamp.name, {
            x: x + 10,
            y: y + boxH - 36,
            size: 10,
            font: fontRegular,
            color: rgb(0.08, 0.09, 0.11),
          });
          lastPage.drawText(`${stamp.role} · ${stamp.dateText}`, {
            x: x + 10,
            y: y + boxH - 50,
            size: 8,
            font: fontRegular,
            color: rgb(0.34, 0.36, 0.39),
          });
        }

        return pdfDoc.save();
      },
    }));

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between font-mono text-xs uppercase tracking-wider text-inkfaint">
          <div className="flex items-center gap-2">
            <button
              disabled={pageIndex <= 1}
              onClick={() => goToPage(pageIndex - 1)}
              className="border border-ink/20 px-2 py-1 disabled:opacity-30"
            >
              ← Hal
            </button>
            <span>
              {pageIndex} / {numPages || "…"}
            </span>
            <button
              disabled={pageIndex >= numPages}
              onClick={() => goToPage(pageIndex + 1)}
              className="border border-ink/20 px-2 py-1 disabled:opacity-30"
            >
              Hal →
            </button>
          </div>
          <button
            onClick={clearPage}
            className="border border-press/30 px-2 py-1 text-press"
          >
            Hapus Coretan Hal. Ini
          </button>
        </div>

        <div
          className="relative border border-ink/15 bg-white shadow-sm"
          style={{ width: pageSize.width, height: pageSize.height }}
        >
          <Document file={fileUrl} onLoadSuccess={(d) => setNumPages(d.numPages)}>
            <Page
              pageNumber={pageIndex}
              width={pageSize.width}
              onRenderSuccess={(page) => {
                const h = (page.height / page.width) * PAGE_WIDTH;
                setPageSize((prev) =>
                  prev.height === h ? prev : { width: PAGE_WIDTH, height: h }
                );
              }}
            />
          </Document>
          <canvas
            ref={canvasRef}
            width={pageSize.width}
            height={pageSize.height}
            className="absolute left-0 top-0 cursor-crosshair touch-none"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
          />
        </div>
        <p className="font-mono text-[11px] text-inkfaint">
          Coret langsung di atas dokumen untuk menandai revisi (tinta merah). Coretan tersimpan per halaman.
        </p>
      </div>
    );
  }
);

export default PdfReviewer;
