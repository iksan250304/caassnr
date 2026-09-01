import { pdfjs } from "react-pdf";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

export interface SignerInfo {
  name: string;
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
}

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

// Path SVG untuk kotak bersudut tumpul. Anchor (x,y) = pojok KIRI ATAS kotak;
// koordinat lokal path pakai konvensi y-ke-bawah (khas SVG) — pdf-lib otomatis
// membalik ini jadi ke-bawah di halaman PDF dari titik anchor tsb.
function roundedRectPath(w: number, h: number, r: number): string {
  return [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `Z`,
  ].join(" ");
}

function drawRoundedBox(
  page: PDFPage,
  xLeft: number,
  yTop: number,
  w: number,
  h: number,
  r: number,
  borderColor = rgb(0.1, 0.1, 0.1)
) {
  page.drawSvgPath(roundedRectPath(w, h, r), {
    x: xLeft,
    y: yTop,
    borderColor,
    borderWidth: 1.3,
  });
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
  const marginX = 50;
  const contentWidth = width - marginX * 2;

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // 1. Judul + garis bawah
  let cursorY = height - 70;
  const titleText = "Content Approval Internal";
  const titleSize = 26;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: cursorY,
    size: titleSize,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });
  cursorY -= 22;
  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: width - marginX, y: cursorY },
    thickness: 1.5,
    color: rgb(0.05, 0.05, 0.05),
  });
  cursorY -= 40;

  // 2. Nama File & Tanggal Cetak
  page.drawText(`Nama File: ${params.title}`, {
    x: marginX,
    y: cursorY,
    size: 12,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 26;
  page.drawText(`Tanggal Cetak: ${params.printDate}`, {
    x: marginX,
    y: cursorY,
    size: 12,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 36;

  // Alokasi ruang dari sini ke bawah: kotak preview besar, lalu kotak TTD 3 kolom,
  // lalu disclaimer merah di paling bawah.
  const disclaimerHeight = 26;
  const signatureBoxHeight = 150;
  const gapBetweenBoxes = 14;
  const bottomMargin = 40;

  const previewBoxTop = cursorY;
  const previewBoxHeight =
    previewBoxTop -
    bottomMargin -
    disclaimerHeight -
    signatureBoxHeight -
    gapBetweenBoxes;

  // 3. Kotak besar "Preview PDF Cetak"
  drawRoundedBox(page, marginX, previewBoxTop, contentWidth, previewBoxHeight, 14);

  const previewPadding = 20;
  const previewPng = await renderFirstPageToPng(params.finalPdfBytes);
  const previewImage = await pdfDoc.embedPng(previewPng);
  const previewDims = previewImage.scale(1);
  const maxPreviewW = contentWidth - previewPadding * 2;
  const maxPreviewH = previewBoxHeight - previewPadding * 2;
  const previewScale = Math.min(maxPreviewW / previewDims.width, maxPreviewH / previewDims.height, 1);
  const previewW = previewDims.width * previewScale;
  const previewH = previewDims.height * previewScale;
  page.drawImage(previewImage, {
    x: marginX + (contentWidth - previewW) / 2,
    y: previewBoxTop - previewBoxHeight + (previewBoxHeight - previewH) / 2,
    width: previewW,
    height: previewH,
  });

  // 4. Kotak TTD 3 kolom (Tim Design | Tim Produk | Purchasing) dengan pita label abu-abu
  const sigBoxTop = previewBoxTop - previewBoxHeight - gapBetweenBoxes;
  const colWidth = contentWidth / 3;
  const labelBandHeight = 34;
  const ttdAreaHeight = signatureBoxHeight - labelBandHeight;
  const grayColor = rgb(0.85, 0.87, 0.87);

  // Pita abu-abu label (digambar dulu sebagai fill polos, border rounded di atasnya nanti)
  page.drawRectangle({
    x: marginX,
    y: sigBoxTop - signatureBoxHeight,
    width: contentWidth,
    height: labelBandHeight,
    color: grayColor,
  });

  const columns: { label: string; signer: SignerInfo }[] = [
    { label: "Tim Design", signer: params.design },
    { label: "Tim Produk", signer: params.produk },
    { label: "Purchasing", signer: params.purchasing },
  ];

  for (let i = 0; i < columns.length; i++) {
    const { label, signer } = columns[i];
    const colX = marginX + i * colWidth;
    const embedded = await embedSigner(pdfDoc, signer);

    if (embedded) {
      const { image, dims } = embedded;
      const maxW = colWidth - 24;
      const maxH = ttdAreaHeight - 24;
      const scale = Math.min(maxW / dims.width, maxH / dims.height, 1);
      const w = dims.width * scale;
      const h = dims.height * scale;
      page.drawImage(image, {
        x: colX + (colWidth - w) / 2,
        y: sigBoxTop - ttdAreaHeight / 2 - h / 2,
        width: w,
        height: h,
      });
    } else {
      const placeholder = "TTD";
      const size = 16;
      const pw = fontRegular.widthOfTextAtSize(placeholder, size);
      page.drawText(placeholder, {
        x: colX + (colWidth - pw) / 2,
        y: sigBoxTop - ttdAreaHeight / 2 - size / 3,
        size,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    const labelSize = 14;
    const labelWidth = fontBold.widthOfTextAtSize(label, labelSize);
    page.drawText(label, {
      x: colX + (colWidth - labelWidth) / 2,
      y: sigBoxTop - signatureBoxHeight + (labelBandHeight - labelSize) / 2 + 2,
      size: labelSize,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });
  }

  // Garis pembatas vertikal antar kolom (tembus dari atas kotak sampai bawah pita abu-abu)
  for (let i = 1; i < 3; i++) {
    const lineX = marginX + i * colWidth;
    page.drawLine({
      start: { x: lineX, y: sigBoxTop },
      end: { x: lineX, y: sigBoxTop - signatureBoxHeight },
      thickness: 1,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  // Garis pembatas horizontal antara area TTD dan pita label
  page.drawLine({
    start: { x: marginX, y: sigBoxTop - ttdAreaHeight },
    end: { x: marginX + contentWidth, y: sigBoxTop - ttdAreaHeight },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Border luar rounded, digambar terakhir supaya menutup rapi sudut kotak
  drawRoundedBox(page, marginX, sigBoxTop, contentWidth, signatureBoxHeight, 14);

  // 5. Disclaimer merah miring, paling bawah
  const disclaimer =
    "*Seluruh Bubuhan TTD harus bisa dipertanggung jawabkan ketika terjadi sesuatu dimasa mendatang";
  const disclaimerY = sigBoxTop - signatureBoxHeight - 22;
  const disclaimerLines = wrapText(disclaimer, fontItalic, 10, contentWidth);
  let dY = disclaimerY;
  for (const line of disclaimerLines) {
    page.drawText(line, {
      x: marginX,
      y: dY,
      size: 10,
      font: fontItalic,
      color: rgb(0.8, 0.08, 0.08),
    });
    dY -= 13;
  }

  return pdfDoc.save();
}
