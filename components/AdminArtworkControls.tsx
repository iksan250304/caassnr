"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteArtworkWithFiles } from "@/lib/deleteArtwork";
import { getSignedUrl } from "@/lib/storage";
import {
  Artwork,
  ArtworkStatus,
  Category,
  CATEGORY_LABEL,
  STATUS_LABEL,
} from "@/lib/types";

// 'printed' sengaja tidak masuk pilihan — status itu cuma boleh dicapai lewat
// alur resmi "Naik Cetak" di Purchasing (supaya file bertanda-tangan lengkap
// otomatis dibuat), bukan lewat shortcut edit ini.
const EDITABLE_STATUSES: ArtworkStatus[] = [
  "draft",
  "pending_product",
  "approved_product",
  "rejected_product",
];

export default function AdminArtworkControls({ artwork }: { artwork: Artwork }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: artwork.title,
    description: artwork.description ?? "",
    category: artwork.category,
    status: artwork.status,
  });

  const isPrinted = artwork.status === "printed";

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("artworks")
      .update({
        title: form.title,
        description: form.description || null,
        category: form.category,
        status: form.status,
      })
      .eq("id", artwork.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    const warning = isPrinted ? "File ini SUDAH NAIK CETAK. " : "";
    if (
      !confirm(
        `${warning}Hapus artwork "${artwork.title}" beserta semua file PDF-nya dari storage? Tindakan tidak dapat dibatalkan.`
      )
    )
      return;
    setDeleting(true);
    setError(null);
    const { error } = await deleteArtworkWithFiles(artwork.id);
    if (error) {
      setError(error);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  // Batalkan Naik Cetak: file kembali ke Purchasing (tab Siap Cetak). Dari sana
  // Purchasing mengembalikan ke Produk, lalu Produk ke Design untuk direvisi.
  async function handleCancelPrint() {
    setError(null);
    if (!cancelNote.trim()) {
      setError("Tuliskan alasan pembatalan naik cetak.");
      return;
    }
    setCancelling(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      // Pulihkan ke file versi ACC Produk (belum ada TTD Purchasing). Kalau memakai
      // file print-ready, stempel Purchasing akan tertumpuk dua kali saat Naik Cetak ulang.
      const approvedPath = `${artwork.id}/v${artwork.version}-approved.pdf`;
      try {
        await getSignedUrl(approvedPath, 60);
      } catch {
        throw new Error(
          "File versi ACC Produk tidak ditemukan di storage, pembatalan dihentikan."
        );
      }

      const { error: updateError } = await supabase
        .from("artworks")
        .update({ status: "approved_product", file_url: approvedPath })
        .eq("id", artwork.id);
      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("approval_logs").insert({
        artwork_id: artwork.id,
        actor_id: user.id,
        action: "cancelled_by_admin",
        feedback_notes: cancelNote.trim(),
      });
      if (logError) {
        setError(
          `Status sudah dikembalikan ke Purchasing, tetapi catatan audit gagal disimpan: ${logError.message}`
        );
        router.refresh();
        return;
      }

      setCancelOpen(false);
      setCancelNote("");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Gagal membatalkan naik cetak.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-dashed border-ink/15 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-inkfaint">
          Admin
        </span>

        {isPrinted ? (
          <button
            onClick={() => setCancelOpen((o) => !o)}
            className="font-mono text-[10px] uppercase tracking-wider text-proof hover:underline"
          >
            {cancelOpen ? "Tutup" : "Batalkan Naik Cetak"}
          </button>
        ) : (
          <button
            onClick={() => setEditing((e) => !e)}
            className="font-mono text-[10px] uppercase tracking-wider text-proof hover:underline"
          >
            {editing ? "Tutup Edit" : "Edit"}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="font-mono text-[10px] uppercase tracking-wider text-press hover:underline disabled:opacity-50"
        >
          {deleting ? "Menghapus…" : "Hapus"}
        </button>
      </div>

      {isPrinted && cancelOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-press/30 bg-press/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-press">
            File kembali ke Purchasing (Siap Cetak), lalu diteruskan ke Produk dan Design.
          </p>
          <textarea
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            rows={2}
            className="rounded-xl border border-press/40 bg-white px-2 py-1 text-sm outline-none focus:border-press"
            placeholder="Alasan pembatalan, mis. file yang dikirim ke vendor salah."
          />
          <button
            onClick={handleCancelPrint}
            disabled={cancelling}
            className="self-start rounded-xl bg-ink px-3 py-1.5 font-mono text-[10px] uppercase text-paper disabled:opacity-50"
          >
            {cancelling ? "Memproses…" : "Konfirmasi Pembatalan"}
          </button>
        </div>
      )}

      {!isPrinted && editing && (
        <div className="flex flex-col gap-2 border border-ink/15 bg-stock p-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border border-ink/20 bg-white px-2 py-1 text-sm"
            placeholder="Judul"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-ink/20 bg-white px-2 py-1 text-sm"
            placeholder="Deskripsi"
            rows={2}
          />
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="flex-1 border border-ink/20 bg-white px-2 py-1 text-xs"
            >
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ArtworkStatus })}
              className="flex-1 border border-ink/20 bg-white px-2 py-1 text-xs"
            >
              {EDITABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="self-start bg-ink px-3 py-1.5 font-mono text-[10px] uppercase text-paper disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      )}
      {error && <p className="font-mono text-[10px] text-press">{error}</p>}
    </div>
  );
}