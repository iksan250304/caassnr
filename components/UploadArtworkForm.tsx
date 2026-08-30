"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPdf, validatePdf } from "@/lib/storage";
import { useRouter } from "next/navigation";

/**
 * Two modes:
 *  - create: fresh artwork submission by the Design team
 *  - revise: re-upload after a "rejected_product" verdict (auto-increments version)
 */
export default function UploadArtworkForm({
  mode,
  artwork,
  onDone,
}: {
  mode: "create" | "revise";
  artwork?: { id: string; version: number; title: string };
  onDone?: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState(artwork?.title ?? "");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Pilih file PDF terlebih dahulu.");
      return;
    }
    const validationError = validatePdf(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir, silakan masuk kembali.");

      if (mode === "create") {
        const id = crypto.randomUUID();
        const path = `${id}/v1.pdf`;
        await uploadPdf(path, file);

        const { error: insertError } = await supabase.from("artworks").insert({
          id,
          title,
          description,
          file_url: path,
          version: 1,
          status: "pending_product",
          created_by: user.id,
        });
        if (insertError) throw insertError;

        await supabase.from("approval_logs").insert({
          artwork_id: id,
          actor_id: user.id,
          action: "submitted",
          feedback_notes: "Pengajuan artwork baru.",
        });
      } else if (mode === "revise" && artwork) {
        const nextVersion = artwork.version + 1;
        const path = `${artwork.id}/v${nextVersion}.pdf`;
        await uploadPdf(path, file);

        const { error: updateError } = await supabase
          .from("artworks")
          .update({
            file_url: path,
            version: nextVersion,
            status: "pending_product",
            title,
            description,
          })
          .eq("id", artwork.id);
        if (updateError) throw updateError;

        await supabase.from("approval_logs").insert({
          artwork_id: artwork.id,
          actor_id: user.id,
          action: "submitted",
          feedback_notes: `Revisi v${nextVersion} diunggah.`,
        });
      }

      setFile(null);
      onDone?.();
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Gagal mengunggah artwork.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ticket flex flex-col gap-4 p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
        {mode === "create" ? "Ajukan Artwork Baru" : `Unggah Revisi — v${(artwork?.version ?? 1) + 1}`}
      </p>

      {mode === "create" && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
              Judul Artwork
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
              placeholder="Contoh: Kemasan Botol 250ml — Edisi Ramadhan"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
              Deskripsi (opsional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
          File PDF (maks. 10 MB)
        </span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="border border-dashed border-ink/25 bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:font-mono file:text-xs file:uppercase file:text-paper"
        />
      </label>

      {error && (
        <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="self-start bg-ink px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition hover:bg-proofdark disabled:opacity-50"
      >
        {loading ? "Mengunggah…" : mode === "create" ? "Kirim untuk Review" : "Kirim Revisi"}
      </button>
    </form>
  );
}
