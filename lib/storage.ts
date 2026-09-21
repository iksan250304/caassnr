import { createClient } from "@/lib/supabase/client";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 2 MB
export const BUCKET = "artworks";
export const SIGNATURE_BUCKET = "signatures";

export function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") return "File harus berformat PDF.";
  if (file.size > MAX_FILE_BYTES) return "Ukuran file melebihi 10 MB.";
  return null;
}

export function validateSignatureImage(file: File): string | null {
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return "Gambar tanda tangan harus berformat PNG atau JPG.";
  }
  if (file.size > MAX_SIGNATURE_BYTES) return "Ukuran gambar melebihi 2 MB.";
  return null;
}

// Bikin nama file aman buat header Content-Disposition. Selain karakter yang
// ilegal di nama file OS, kita juga buang tanda kurung/bracket/ampersand
// supaya tidak ikut ter-percent-encode (mis. "[" jadi "%5B") — beberapa
// browser/OS menampilkan hasil encode itu mentah-mentah alih-alih men-decode-nya.
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "-") // karakter ilegal di nama file OS
    .replace(/[[\]{}]/g, "") // [ ] { } — mis. "[InnerBox]"
    .replace(/[()]/g, "") // ( ) — mis. "(2026)"
    .replace(/&/g, "dan") // & sering bikin masalah di beberapa parser header
    .replace(/\s+/g, " ") // rapikan spasi ganda sisa penghapusan simbol
    .trim();
}

/**
 * @param downloadFilename Kalau diisi, browser akan menyimpan file dengan nama
 * ini (mis. judul artwork) alih-alih nama path storage yang generik (v2.pdf dst).
 */
export async function getSignedUrl(
  path: string,
  expiresIn = 3600,
  bucket: string = BUCKET,
  downloadFilename?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(
      path,
      expiresIn,
      downloadFilename ? { download: sanitizeFilename(downloadFilename) } : undefined
    );
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadPdf(path: string, file: File | Blob) {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function uploadSignatureImage(path: string, file: File) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return path;
}