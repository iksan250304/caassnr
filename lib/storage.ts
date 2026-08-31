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

export async function getSignedUrl(
  path: string,
  expiresIn = 3600,
  bucket: string = BUCKET
) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
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