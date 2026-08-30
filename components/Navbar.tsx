"use client";

import { createClient } from "@/lib/supabase/client";
import { Role } from "@/lib/types";
import { useRouter } from "next/navigation";

const ROLE_TITLE: Record<Role, string> = {
  design: "Meja Desain",
  product: "Meja Produk",
  purchasing: "Meja Purchasing",
  admin: "Panel Admin",
};

export default function Navbar({
  role,
  fullName,
}: {
  role: Role;
  fullName: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="regmark flex h-9 w-9 items-center justify-center border border-ink/60 text-[10px] font-mono text-ink">
            +
          </div>
          <div>
            <p className="font-display text-sm tracking-tight text-ink">
              CAAS
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
              {ROLE_TITLE[role]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-xs text-inkfaint sm:inline">
            {fullName}
          </span>
          <button
            onClick={handleSignOut}
            className="border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink transition hover:border-press hover:text-press"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
