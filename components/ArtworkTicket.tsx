import { Artwork } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";
import Link from "next/link";

export default function ArtworkTicket({
  artwork,
  href,
  actionLabel,
}: {
  artwork: Artwork;
  href?: string;
  actionLabel?: string;
}) {
  const body = (
    <div className="regmark ticket relative flex flex-col gap-3 p-5 transition hover:border-ink/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
            Job No. {artwork.id.slice(0, 8)} · v{artwork.version}
          </p>
          <h3 className="mt-1 font-display text-base leading-tight text-ink">
            {artwork.title}
          </h3>
        </div>
        <StatusBadge status={artwork.status} />
      </div>
      {artwork.description && (
        <p className="text-sm text-inkfaint">{artwork.description}</p>
      )}
      <div className="flex items-center justify-between border-t border-dashed border-ink/15 pt-3">
        <p className="font-mono text-[11px] text-inkfaint">
          {artwork.creator?.full_name ?? "—"} ·{" "}
          {format(new Date(artwork.created_at), "d MMM yyyy, HH:mm")}
        </p>
        {actionLabel && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-proof">
            {actionLabel} →
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{body}</Link>;
  }
  return body;
}
