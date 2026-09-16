import { Artwork } from "@/lib/types";
import PurchasingItem from "./PurchasingItem";

export default function PurchasingReadyList({
  ready,
  isAdmin,
}: {
  ready: Artwork[];
  isAdmin?: boolean;
}) {
  if (!ready.length) {
    return (
      <p className="ticket-perf border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-inkfaint">
        Belum ada artwork yang disetujui tim produk.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ready.map((artwork) => (
        <PurchasingItem key={artwork.id} artwork={artwork} isAdmin={isAdmin} />
      ))}
    </div>
  );
}