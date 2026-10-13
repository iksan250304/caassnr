"use client";

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2 font-mono text-xs uppercase tracking-wider text-slate-600">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
      >
        ← Sebelumnya
      </button>
      <span>
        Hal {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
      >
        Berikutnya →
      </button>
    </div>
  );
}