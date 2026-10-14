import { ArtworkStatus, STATUS_LABEL } from "@/lib/types";

// Warna ditulis langsung (hex), bukan class Tailwind, supaya selalu terlihat
// apa pun isi tailwind.config. Ubah hex di sini kalau mau ganti warna.
const BADGE_STYLE: Record<
  ArtworkStatus,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  draft: { color: "#4B5563", backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  pending_product: { color: "#B45309", backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
  approved_product: { color: "#0369A1", backgroundColor: "#E0F2FE", borderColor: "#7DD3FC" },
  rejected_product: { color: "#B91C1C", backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
  printed: { color: "#166534", backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
};

export default function StatusBadge({
  status,
  className = "",
}: {
  status: ArtworkStatus;
  className?: string;
}) {
  return (
    <span
      style={BADGE_STYLE[status]}
      className={`inline-flex w-fit items-center gap-1.5 rounded-2xl border px-2.5 py-1 font-mono text-[10px] uppercase leading-tight tracking-wider sm:text-[11px] ${className}`}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}