import { ArtworkStatus, STATUS_COLOR, STATUS_LABEL } from "@/lib/types";
import clsx from "clsx";

export default function StatusBadge({ status }: { status: ArtworkStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[11px] uppercase tracking-wider",
        STATUS_COLOR[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
