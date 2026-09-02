import { pdfjs } from "react-pdf";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

export interface SignerInfo {
  name: string;
  date?: string; // tanggal approve masing-masing role, ditampilkan di kolom TTD
  signatureBytes?: ArrayBuffer;
  signatureExt?: "png" | "jpg";
}

export interface ApprovalSheetParams {
  title: string;
  printDate: string;
  finalPdfBytes: ArrayBuffer; // dipakai untuk render preview halaman pertama
  design: SignerInfo;
  produk: SignerInfo;
  purchasing: SignerInfo;
  logoBytes?: ArrayBuffer; // logo perusahaan, opsional
  logoExt?: "png" | "jpg";
}

const RED = rgb(0.91, 0.11, 0.11);
const BLACK = rgb(0.06, 0.06, 0.06);
const GRAY = rgb(0.4, 0.4, 0.4);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderFirstPageToPng(pdfBytes: ArrayBuffer): Promise<ArrayBuffer> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  return fetch(dataUrl).then((r) => r.arrayBuffer());
}

async function embedSigner(pdfDoc: PDFDocument, signer: SignerInfo) {
  if (!signer.signatureBytes) return null;
  const image =
    signer.signatureExt === "jpg"
      ? await pdfDoc.embedJpg(signer.signatureBytes)
      : await pdfDoc.embedPng(signer.signatureBytes);
  return { image, dims: image.scale(1) };
}

export async function generateApprovalSheetPdf(
  params: ApprovalSheetParams
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 potrait, points
  const { width, height } = page.getSize();
  const marginX = 45;
  const contentWidth = width - marginX * 2;

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // =========================================================
  // 1. HEADER — judul merah, subjudul italic, logo (kanan atas), garis hitam
  // =========================================================
  let cursorY = height - 55;

  page.drawText("Content Approval Internal", {
    x: marginX,
    y: cursorY,
    size: 26,
    font: fontBold,
    color: RED,
  });
  cursorY -= 24;
  page.drawText("Dokumen persetujuan (Document)", {
    x: marginX,
    y: cursorY,
    size: 12,
    font: fontItalic,
    color: BLACK,
  });

  if (params.logoBytes) {
    const logoImage =
      params.logoExt === "jpg"
        ? await pdfDoc.embedJpg(params.logoBytes)
        : await pdfDoc.embedPng(params.logoBytes);
    const dims = logoImage.scale(1);
    const maxLogoW = 155;
    const maxLogoH = 40;
    const scale = Math.min(maxLogoW / dims.width, maxLogoH / dims.height, 1);
    const w = dims.width * scale;
    const h = dims.height * scale;
    page.drawImage(logoImage, {
      x: width - marginX - w,
      y: height - 55 - h + 8,
      width: w,
      height: h,
    });
  }

  cursorY -= 18;
  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: width - marginX, y: cursorY },
    thickness: 2,
    color: BLACK,
  });
  cursorY -= 28;

  // =========================================================
  // 2. TABEL "Detail File Approve"
  // =========================================================
  const barHeight = 28;
  const rowHeight = 32;
  const labelColWidth = 140;
  const detailTableHeight = barHeight + rowHeight * 2;
  const detailTableTop = cursorY;

  // Bar merah
  page.drawRectangle({
    x: marginX,
    y: detailTableTop - barHeight,
    width: contentWidth,
    height: barHeight,
    color: RED,
  });
  const barLabel = "Detail File Approve";
  const barLabelSize = 13;
  const barLabelWidth = fontBold.widthOfTextAtSize(barLabel, barLabelSize);
  page.drawText(barLabel, {
    x: marginX + (contentWidth - barLabelWidth) / 2,
    y: detailTableTop - barHeight / 2 - barLabelSize / 3,
    size: barLabelSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const detailRows: [string, string][] = [
    ["Nama File:", params.title],
    ["Tanggal Cetak:", params.printDate],
  ];
  detailRows.forEach(([label, value], i) => {
    const rowTop = detailTableTop - barHeight - rowHeight * i;
    page.drawText(label, {
      x: marginX + 12,
      y: rowTop - rowHeight / 2 - 4,
      size: 11,
      font: fontRegular,
      color: BLACK,
    });
    const valueLines = wrapText(value, fontRegular, 11, contentWidth - labelColWidth - 24);
    page.drawText(valueLines[0] ?? "", {
      x: marginX + labelColWidth + 12,
      y: rowTop - rowHeight / 2 - 4,
      size: 11,
      font: fontRegular,
      color: BLACK,
    });
  });

  // Garis-garis tabel (vertikal antar kolom, horizontal antar baris, border luar)
  page.drawLine({
    start: { x: marginX + labelColWidth, y: detailTableTop - barHeight },
    end: { x: marginX + labelColWidth, y: detailTableTop - detailTableHeight },
    thickness: 1,
    color: BLACK,
  });
  page.drawLine({
    start: { x: marginX, y: detailTableTop - barHeight - rowHeight },
    end: { x: marginX + contentWidth, y: detailTableTop - barHeight - rowHeight },
    thickness: 1,
    color: BLACK,
  });
  page.drawRectangle({
    x: marginX,
    y: detailTableTop - detailTableHeight,
    width: contentWidth,
    height: detailTableHeight,
    borderColor: BLACK,
    borderWidth: 1.2,
  });

  cursorY = detailTableTop - detailTableHeight - 22;

  // =========================================================
  // Alokasi ruang tersisa: kotak preview besar, tabel TTD 3 kolom, disclaimer
  // =========================================================
  const disclaimerHeight = 20;
  const ttdRowHeight = 78;
  const nameRowHeight = 28;
  const dateRowHeight = 24;
  const sigTableHeight = ttdRowHeight + nameRowHeight + dateRowHeight;
  const gapBeforeSig = 16;
  const bottomMargin = 36;

  const previewBoxTop = cursorY;
  const previewBoxHeight =
    previewBoxTop - bottomMargin - disclaimerHeight - sigTableHeight - gapBeforeSig;

  // =========================================================
  // 3. Kotak "Preview PDF Cetak" (sudut siku, sesuai template baru)
  // =========================================================
  page.drawRectangle({
    x: marginX,
    y: previewBoxTop - previewBoxHeight,
    width: contentWidth,
    height: previewBoxHeight,
    borderColor: BLACK,
    borderWidth: 1.2,
  });

  const previewPadding = 20;
  const previewPng = await renderFirstPageToPng(params.finalPdfBytes);
  const previewImage = await pdfDoc.embedPng(previewPng);
  const previewDims = previewImage.scale(1);
  const maxPreviewW = contentWidth - previewPadding * 2;
  const maxPreviewH = previewBoxHeight - previewPadding * 2;
  const previewScale = Math.min(
    maxPreviewW / previewDims.width,
    maxPreviewH / previewDims.height,
    1
  );
  const previewW = previewDims.width * previewScale;
  const previewH = previewDims.height * previewScale;
  page.drawImage(previewImage, {
    x: marginX + (contentWidth - previewW) / 2,
    y: previewBoxTop - previewBoxHeight + (previewBoxHeight - previewH) / 2,
    width: previewW,
    height: previewH,
  });

  // =========================================================
  // 4. Tabel TTD 3 kolom: TTD | Name (Role) [pita merah] | Tanggal
  // =========================================================
  const sigTop = previewBoxTop - previewBoxHeight - gapBeforeSig;
  const colWidth = contentWidth / 3;

  const columns: { roleLabel: string; signer: SignerInfo }[] = [
    { roleLabel: "Design", signer: params.design },
    { roleLabel: "Product", signer: params.produk },
    { roleLabel: "Purchasing", signer: params.purchasing },
  ];

  // Pita merah nama (fill dulu sebelum garis/border supaya rapi)
  const nameRowTop = sigTop - ttdRowHeight;
  page.drawRectangle({
    x: marginX,
    y: nameRowTop - nameRowHeight,
    width: contentWidth,
    height: nameRowHeight,
    color: RED,
  });

  for (let i = 0; i < columns.length; i++) {
    const { roleLabel, signer } = columns[i];
    const colX = marginX + i * colWidth;
    const embedded = await embedSigner(pdfDoc, signer);

    // Area TTD (gambar tanda tangan atau placeholder teks)
    if (embedded) {
      const { image, dims } = embedded;
      const maxW = colWidth - 24;
      const maxH = ttdRowHeight - 20;
      const scale = Math.min(maxW / dims.width, maxH / dims.height, 1);
      const w = dims.width * scale;
      const h = dims.height * scale;
      page.drawImage(image, {
        x: colX + (colWidth - w) / 2,
        y: sigTop - ttdRowHeight / 2 - h / 2,
        width: w,
        height: h,
      });
    } else {
      const placeholder = "TTD";
      const size = 15;
      const pw = fontRegular.widthOfTextAtSize(placeholder, size);
      page.drawText(placeholder, {
        x: colX + (colWidth - pw) / 2,
        y: sigTop - ttdRowHeight / 2 - size / 3,
        size,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    // Pita merah: nama + (Role)
    const nameText = `${signer.name || "-"} (${roleLabel})`;
    const nameSize = 11.5;
    let displayName = nameText;
    while (
      fontBold.widthOfTextAtSize(displayName, nameSize) > colWidth - 12 &&
      displayName.length > 4
    ) {
      displayName = displayName.slice(0, -2);
    }
    const nameWidth = fontBold.widthOfTextAtSize(displayName, nameSize);
    page.drawText(displayName, {
      x: colX + (colWidth - nameWidth) / 2,
      y: nameRowTop - nameRowHeight / 2 - nameSize / 3,
      size: nameSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Tanggal approve masing-masing role
    const dateText = `Tanggal: ${signer.date ?? "-"}`;
    const dateSize = 9.5;
    let displayDate = dateText;
    while (
      fontRegular.widthOfTextAtSize(displayDate, dateSize) > colWidth - 12 &&
      displayDate.length > 10
    ) {
      displayDate = displayDate.slice(0, -2);
    }
    page.drawText(displayDate, {
      x: colX + 8,
      y: nameRowTop - nameRowHeight - dateRowHeight / 2 - dateSize / 3,
      size: dateSize,
      font: fontRegular,
      color: BLACK,
    });
  }

  // Garis vertikal antar kolom (tembus 3 baris)
  for (let i = 1; i < 3; i++) {
    const lineX = marginX + i * colWidth;
    page.drawLine({
      start: { x: lineX, y: sigTop },
      end: { x: lineX, y: sigTop - sigTableHeight },
      thickness: 1,
      color: BLACK,
    });
  }
  // Garis horizontal antar baris (TTD / nama / tanggal)
  page.drawLine({
    start: { x: marginX, y: nameRowTop },
    end: { x: marginX + contentWidth, y: nameRowTop },
    thickness: 1,
    color: BLACK,
  });
  page.drawLine({
    start: { x: marginX, y: nameRowTop - nameRowHeight },
    end: { x: marginX + contentWidth, y: nameRowTop - nameRowHeight },
    thickness: 0.5,
    color: BLACK,
  });
  // Border luar
  page.drawRectangle({
    x: marginX,
    y: sigTop - sigTableHeight,
    width: contentWidth,
    height: sigTableHeight,
    borderColor: BLACK,
    borderWidth: 1.2,
  });

  // =========================================================
  // 5. Disclaimer merah miring, paling bawah
  // =========================================================
  const disclaimer =
    "*Seluruh Bubuhan TTD harus bisa dipertanggung jawabkan ketika terjadi sesuatu dimasa mendatang";
  const disclaimerY = sigTop - sigTableHeight - 20;
  const disclaimerLines = wrapText(disclaimer, fontItalic, 10, contentWidth);
  let dY = disclaimerY;
  for (const line of disclaimerLines) {
    page.drawText(line, {
      x: marginX,
      y: dY,
      size: 10,
      font: fontItalic,
      color: RED,
    });
    dY -= 13;
  }

  return pdfDoc.save();
}
