import AdminUserManager from "@/components/AdminUserManager";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Pengguna</h1>
        <p className="mt-1 text-sm text-inkfaint">Kelola akses pengguna seluruh tim.</p>
      </div>

      <AdminUserManager />
    </div>
  );
}