import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProductReviewClient from "@/components/ProductReviewClient";

export default async function ProductReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: artwork } = await supabase
    .from("artworks")
    .select("*, creator:created_by(id, full_name, role)")
    .eq("id", params.id)
    .single();

  if (!artwork) notFound();

  const { data: signed } = await supabase.storage
    .from("artworks")
    .createSignedUrl(artwork.file_url, 3600);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();

  return (
    <ProductReviewClient
      artwork={artwork}
      signedUrl={signed?.signedUrl ?? ""}
      reviewer={{ name: profile!.full_name, role: profile!.role }}
    />
  );
}
