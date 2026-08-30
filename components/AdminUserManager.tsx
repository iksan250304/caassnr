"use client";

import { useEffect, useState } from "react";
import { Profile, Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  design: "Design",
  product: "Produk",
  purchasing: "Purchasing",
  admin: "Admin",
};

export default function AdminUserManager() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "design" as Role,
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (res.ok) setUsers(json.users);
    else setError(json.error);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setForm({ email: "", password: "", full_name: "", role: "design" });
    setShowForm(false);
    load();
  }

  async function handleRoleChange(id: string, role: Role, full_name: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, full_name }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus user ini? Tindakan tidak dapat dibatalkan.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
    } else if (json.deactivated) {
      setNotice(json.message);
      setError(null);
    } else {
      setNotice(null);
      setError(null);
    }
    load();
  }

  async function handleReactivate(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reactivate: true }),
    });
    setNotice("Akun diaktifkan kembali dan bisa login seperti biasa.");
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
          Pengguna ({users.length})
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof"
        >
          {showForm ? "Batal" : "+ Tambah User"}
        </button>
      </div>

      {error && (
        <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
          {error}
        </p>
      )}
      {notice && (
        <p className="border border-amber/30 bg-amber/5 px-3 py-2 font-mono text-xs text-amber">
          {notice}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="ticket grid gap-3 p-5 sm:grid-cols-2">
          <input
            required
            placeholder="Nama lengkap"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
          >
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
          />
          <input
            required
            type="password"
            placeholder="Kata sandi awal"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
          />
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 bg-ink py-2.5 font-mono text-xs uppercase tracking-widest text-paper hover:bg-proofdark disabled:opacity-50"
          >
            {submitting ? "Membuat…" : "Buat Akun"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="font-mono text-xs text-inkfaint">Memuat…</p>
      ) : (
        <div className="ticket overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 font-mono text-[10px] uppercase tracking-wider text-inkfaint">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as Role, u.full_name)
                      }
                      className="border border-ink/20 bg-white px-2 py-1 font-mono text-xs"
                    >
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.deactivated ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-press">
                        Nonaktif
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-approve">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {u.deactivated && (
                      <button
                        onClick={() => handleReactivate(u.id)}
                        className="font-mono text-xs uppercase tracking-wider text-proof hover:underline"
                      >
                        Aktifkan
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="font-mono text-xs uppercase tracking-wider text-press hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
