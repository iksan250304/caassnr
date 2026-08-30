"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email atau kata sandi salah. Hubungi admin bila lupa akses.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper">
      <div className="absolute inset-0 bg-halftone bg-halftone opacity-40" />
      <div className="regmark ticket relative z-10 w-full max-w-sm p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center border border-ink text-lg font-mono">
            +
          </div>
          <div>
            <p className="font-display text-lg leading-none">CAAS</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-inkfaint">
              Content Approval Artwork System
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
              placeholder="nama@perusahaan.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-inkfaint">
              Kata Sandi
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-proof"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="border border-press/30 bg-press/5 px-3 py-2 font-mono text-xs text-press">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-ink py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition hover:bg-proofdark disabled:opacity-50"
          >
            {loading ? "Memproses…" : "Masuk"}
          </button>
        </form>

        <p className="mt-6 font-mono text-[10px] text-inkfaint">
          Akun dibuat oleh Administrator. Hubungi admin bila belum memiliki akses.
        </p>
      </div>
    </div>
  );
}
