import UploadArtworkForm from "@/components/UploadArtworkForm";

export default function DesignUploadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Panel Desain</h1>
        <p className="mt-1 text-sm text-inkfaint">
          Ajukan artwork baru, atau bantu cek/revisi punya rekan satu tim.
        </p>
      </div>

      <UploadArtworkForm mode="create" />
    </div>
  );
}