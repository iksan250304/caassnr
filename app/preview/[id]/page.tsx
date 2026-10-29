import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PreviewViewer from "@/components/PreviewViewer";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { file?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: artwork }, { data: profile }] = await Promise.all([
    supabase
      .from("artworks")
      .select("id, title, version, status, file_url")
      .eq("id", params.id)
      .single(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (!artwork) notFound();

  // ?file=clean -> file bersih (yang dikirim ke vendor). Selain itu -> file terkini.
  const isClean = searchParams.file === "clean";
  const path = isClean ? `${artwork.id}/v${artwork.version}.pdf` : artwork.file_url;

  // Link singkat (5 menit): cukup untuk membuka halaman; reload membuat link baru.
  const { data: signed, error } = await supabase.storage
    .from("artworks")
    .createSignedUrl(path, 300);
  if (error || !signed) notFound();

  // Tombol Download: default TERTUTUP, hanya terbuka kalau diizinkan eksplisit.
  const role = profile?.role;
  let canDownload = false;
  if (isClean) {
    // File bersih untuk vendor: hanya SETELAH Naik Cetak, untuk semua role (termasuk Admin).
    canDownload = artwork.status === "printed";
  } else if (role === "design" || role === "product" || role === "admin") {
    canDownload = true;
  } else if (role === "purchasing") {
    canDownload = artwork.status === "printed";
  }

  return (
    <PreviewViewer
      fileUrl={signed.signedUrl}
      title={artwork.title}
      version={artwork.version}
      jobNo={artwork.id.slice(0, 8)}
      downloadPath={canDownload ? path : null}
    />
  );
}