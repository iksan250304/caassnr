"use client";

import { useRef } from "react";

export default function SignatureUploadField({
  file,
  savedPreviewUrl,
  onFileChange,
}: {
  file: File | null;
  savedPreviewUrl: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row">
      <div className="flex h-20 w-32 flex-shrink-0 items-center justify-center border border-dashed border-ink/25 bg-white">
        {file ? (
          <img
            src={URL.createObjectURL(file)}
            alt="Preview TTD baru"
            className="max-h-full max-w-full object-contain"
          />
        ) : savedPreviewUrl ? (
          <img
            src={savedPreviewUrl}
            alt="TTD tersimpan"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="px-2 text-center font-mono text-[10px] text-inkfaint">
            Belum ada TTD
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="self-start border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink transition hover:bg-ink hover:text-paper"
        >
          Pilih Gambar TTD
        </button>
        <p className="font-mono text-[10px] text-inkfaint">
          {file
            ? file.name
            : savedPreviewUrl
            ? "Memakai TTD tersimpan sebelumnya — pilih file baru untuk mengganti"
            : "Belum ada file dipilih (PNG/JPG, maks. 2MB)"}
        </p>
      </div>
    </div>
  );
}
