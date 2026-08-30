import { createClient } from "@/lib/supabase/client";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const BUCKET = "artworks";

export function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") return "File harus berformat PDF.";
  if (file.size > MAX_FILE_BYTES) return "Ukuran file melebihi 10 MB.";
  return null;
}

export async function getSignedUrl(path: string, expiresIn = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
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
