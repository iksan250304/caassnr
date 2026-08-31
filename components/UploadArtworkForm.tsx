"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPdf,
  uploadSignatureImage,
  validatePdf,
  validateSignatureImage,
  getSignedUrl,
  SIGNATURE_BUCKET,
} from "@/lib/storage";
import { useRouter } from "next/navigation";
import { Category, CATEGORY_CODE, CATEGORY_LABEL } from "@/lib/types";
import { CHECKLIST_ITEMS, CHECKLIST_REQUIRED_CATEGORIES } from "@/lib/checklist";
import { format } from "date-fns";

function stripExtension(name: string) {
  return name.replace(/\.pdf$/i, "");
}

function buildTitle(category: Category, fileName: string) {
  return `[${CATEGORY_CODE[category]}] ${stripExtension(fileName)}`;
}

/**
 * Two modes:
 *  - create: fresh artwork submission by the Design team (pilih kategori sendiri)
 *  - revise: re-upload after a "rejected_product" verdict (kategori mengikuti
 *    artwork asal, tidak bisa diubah; version auto-increment)
 */
export default function UploadArtworkForm({
  mode,
  artwork,
  onDone,
}: {
  mode: "create" | "revise";
  artwork?: { id: string; version: number; title: string; category: Category };
  onDone?: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [category, setCategory] = useState<Category | "">(artwork?.category ?? "");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [savedSignaturePath, setSavedSignaturePath] = useState<string | null>(null);
  const [savedSignaturePreview, setSavedSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ambil nama lengkap + tanda tangan tersimpan (jika ada) milik user yang login.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, signature_url")
        .eq("id", user.id)
        .single();
      if (profile) {
        setSignerName(profile.full_name);
        if (profile.signature_url) {
          setSavedSignaturePath(profile.signature_url);
          try {
            const url = await getSignedUrl(profile.signature_url, 3600, SIGNATURE_BUCKET);
            setSavedSignaturePreview(url);
          } catch {
            // signature file might have been removed manually; ignore
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveCategory: Category | null =
    mode === "revise" ? artwork!.category : category || null;
  const requiresChecklist =
    !!effectiveCategory && CHECKLIST_REQUIRED_CATEGORIES.includes(effectiveCategory);
  const checklistComplete =
    !requiresChecklist || CHECKLIST_ITEMS.every((item) => checklist[item.id]);
  const computedTitle =
    effectiveCategory && file ? buildTitle(effectiveCategory, file.name) : null;
  const hasSignatureReady = !!signatureFile || !!savedSignaturePath;

  const canSubmit =
    !!file && !!effectiveCategory && checklistComplete && signed && hasSignatureReady && !loading;

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
    if (mode === "create" && !category) {
      setError("Pilih kategori artwork terlebih dahulu.");
      return;
    }
    if (!checklistComplete) {
      setError("Lengkapi semua checklist wajib sebelum submit.");
      return;
    }
    if (!hasSignatureReady) {
      setError("Unggah gambar tanda tangan (PNG/JPG) terlebih dahulu.");
      return;
    }
    if (signatureFile) {
      const sigError = validateSignatureImage(signatureFile);
      if (sigError) {
        setError(sigError);
        return;
      }
    }
    if (!signed) {
      setError("Centang pernyataan konfirmasi sebelum submit.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir, silakan masuk kembali.");

      // Unggah/ganti gambar TTD kalau user pilih file baru; kalau tidak, pakai
      // yang sudah tersimpan di profil sebelumnya.
      let signaturePath = savedSignaturePath;
      if (signatureFile) {
        const ext = signatureFile.type === "image/png" ? "png" : "jpg";
        signaturePath = await uploadSignatureImage(`${user.id}/signature.${ext}`, signatureFile);
        await supabase
          .from("profiles")
          .update({ signature_url: signaturePath })
          .eq("id", user.id);
      }

      const finalCategory = effectiveCategory as Category;
      const title = buildTitle(finalCategory, file.name);
      const signedAt = format(new Date(), "d MMM yyyy HH:mm");

      const noteLines: string[] = [];
      if (requiresChecklist) {
        noteLines.push("Checklist wajib:");
        CHECKLIST_ITEMS.forEach((item) => noteLines.push(`✓ ${item.label}`));
        noteLines.push("");
      }
      noteLines.push(
        `Ditandatangani secara digital oleh ${signerName || "Tim Design"} pada ${signedAt}.`
      );

      if (mode === "create") {
        const id = crypto.randomUUID();
        const path = `${id}/v1.pdf`;
        await uploadPdf(path, file);

        const { error: insertError } = await supabase.from("artworks").insert({
          id,
          title,
          description,
          category: finalCategory,
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
          feedback_notes: ["Pengajuan artwork baru.", "", ...noteLines].join("\n"),
          signature_url: signaturePath,
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
          feedback_notes: [`Revisi v${nextVersion} diunggah.`, "", ...noteLines].join("\n"),
          signature_url: signaturePath,
        });
      }

      setFile(null);
      setChecklist({});
      setSigned(false);
      setSignatureFile(null);
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
        {mode === "create"
          ? "Ajukan Artwork Baru"
          : `Unggah Revisi — v${(artwork?.version ?? 1) + 1}`}
      </p>

      {mode === "create" ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
            Kategori
          </span>
          <select
            required
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category);
              setChecklist({});
            }}
            className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
          >
            <option value="" disabled>
              Pilih kategori…
            </option>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="font-mono text-xs text-inkfaint">
          Kategori:{" "}
          <span className="text-ink">{CATEGORY_LABEL[artwork!.category]}</span> (mengikuti
          artwork asal, tidak dapat diubah)
        </p>
      )}

      {mode === "create" && (
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

      {computedTitle && (
        <p className="font-mono text-[11px] text-inkfaint">
          Nama artwork akan tersimpan sebagai:{" "}
          <span className="text-ink">{computedTitle}</span>
        </p>
      )}

      {requiresChecklist && (
        <div className="flex flex-col gap-2 border border-amber/30 bg-amber/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">
            Checklist Wajib — {CATEGORY_LABEL[effectiveCategory as Category]}
          </p>
          {CHECKLIST_ITEMS.map((item) => (
            <label key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!checklist[item.id]}
                onChange={(e) =>
                  setChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))
                }
                className="mt-1"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Pernyataan Pengajuan / TTD Digital */}
      <div className="flex flex-col gap-3 border-t border-dashed border-ink/15 pt-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
          Pernyataan Pengajuan
        </p>

        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="flex h-20 w-32 flex-shrink-0 items-center justify-center border border-dashed border-ink/25 bg-white">
            {signatureFile ? (
              <img
                src={URL.createObjectURL(signatureFile)}
                alt="Preview tanda tangan baru"
                className="max-h-full max-w-full object-contain"
              />
            ) : savedSignaturePreview ? (
              <img
                src={savedSignaturePreview}
                alt="Tanda tangan tersimpan"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="px-2 text-center font-mono text-[10px] text-inkfaint">
                Belum ada TTD
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
              Gambar Tanda Tangan (PNG/JPG, maks. 2MB)
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)}
              className="border border-dashed border-ink/25 bg-white px-3 py-2 text-xs file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:text-paper"
            />
            <p className="font-mono text-[10px] text-inkfaint">
              {savedSignaturePath
                ? "Sudah ada TTD tersimpan dari pengajuan sebelumnya — unggah file baru untuk menggantinya, atau biarkan kosong untuk memakai yang lama."
                : "Wajib diunggah sebelum bisa submit. TTD ini akan tersimpan dan otomatis dipakai lagi untuk pengajuan berikutnya."}
            </p>
            <p className="font-mono text-[10px] text-inkfaint">
              Gambar ini akan dibubuhkan ke dokumen final saat Tim Produk ACC, sehingga tetap
              tampil ketika Purchasing mencetak artwork.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
            className="mt-1"
          />
          <span>
            Saya, <strong>{signerName || "…"}</strong>, menyatakan artwork ini sudah final dan
            siap direview oleh Tim Produk.
          </span>
        </label>
      </div>

      {error && (
        <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start bg-ink px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition hover:bg-proofdark disabled:opacity-50"
      >
        {loading ? "Mengunggah…" : mode === "create" ? "Kirim untuk Review" : "Kirim Revisi"}
      </button>
    </form>
  );
}
