"use client";

export default function HistorySearchBar({
  value,
  onChange,
  placeholder = "Cari nama file, Job No., atau pengaju…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-500"
    />
  );
}