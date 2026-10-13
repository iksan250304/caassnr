"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Role } from "@/lib/types";

type NavItem = { href: string; label: string; icon: JSX.Element };

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-5 w-5 flex-shrink-0"
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  plus: "M12 5v14M5 12h14",
  revise: "M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.5 3M18.5 9A7 7 0 0 0 6 6",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3 7v7a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2v-7l3-7Z",
  history: "M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l4 2",
  check: "M9 12l2 2 4-4M21 12a9 9 0 1 1-9-9",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  audit: "M9 12h6M9 16h6M9 8h6M5 4h14a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
};

const SECTION_NAV: Record<string, NavItem[]> = {
  "/design": [
    { href: "/design", label: "Upload Baru", icon: <Icon d={ICONS.plus} /> },
    { href: "/design/revisi", label: "Revisi", icon: <Icon d={ICONS.revise} /> },
    { href: "/design/riwayat", label: "Riwayat Pengajuan", icon: <Icon d={ICONS.folder} /> },
  ],
  "/produk": [
    { href: "/produk", label: "Antrean Review", icon: <Icon d={ICONS.inbox} /> },
    { href: "/produk/riwayat", label: "Riwayat", icon: <Icon d={ICONS.history} /> },
  ],
  "/purchasing": [
    { href: "/purchasing", label: "Siap Cetak", icon: <Icon d={ICONS.check} /> },
    { href: "/purchasing/riwayat", label: "Riwayat Naik Cetak", icon: <Icon d={ICONS.history} /> },
  ],
  "/admin": [
    { href: "/admin", label: "Pengguna", icon: <Icon d={ICONS.users} /> },
    { href: "/admin/audit", label: "Audit Trail", icon: <Icon d={ICONS.audit} /> },
  ],
};

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  // Tutup drawer otomatis setelah pindah halaman (di HP).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const currentSection = "/" + (pathname?.split("/")[1] ?? "");
  const items = SECTION_NAV[currentSection] ?? SECTION_NAV["/" + role] ?? [];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Tombol hamburger: hanya tampil di HP */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="fixed left-3 top-3 z-40 rounded-xl border border-slate-200 bg-white/90 p-2 text-ink shadow-sm backdrop-blur lg:hidden"
      >
        <Icon d={ICONS.menu} />
      </button>

      {/* Lapisan gelap di belakang drawer: klik untuk menutup */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-shrink-0 flex-col overflow-hidden bg-white bg-gradient-to-br from-press/10 via-white to-white transition-transform duration-200 lg:sticky lg:z-auto lg:translate-x-0 lg:self-start lg:bg-transparent ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full bg-press/20 blur-3xl" />

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-ink/60 hover:bg-ink/5 lg:hidden"
        >
          <Icon d={ICONS.close} />
        </button>

        <div className="relative flex flex-col gap-1 px-6 pt-8">
          <div className="flex items-center gap-2">
            <Image src="/icon-sansico.png" alt="Sansico Medica" width={28} height={28} className="h-7 w-7 object-contain" />
            <p className="font-display text-base leading-none">
              <span className="text-press">Sansico</span>
              <span className="text-ink">Medica</span>
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
            Content Approval System
          </p>
        </div>

        <nav className="relative mt-8 flex flex-1 flex-col gap-2 overflow-y-auto px-4">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-press to-pressdark text-white shadow-sm"
                    : "text-press hover:bg-press/5"
                }`}
              >
                {item.icon}
                <span className={active ? "font-medium" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative px-4 pb-8">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-ink/70 transition hover:bg-ink/5 hover:text-ink"
          >
            <Icon d={ICONS.logout} />
            <span className="font-mono text-xs uppercase tracking-wider">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}