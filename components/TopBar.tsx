"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/lib/types";
import NotificationBell from "./NotificationBell";

const ADMIN_SWITCHER = [
  { href: "/admin", label: "Admin" },
  { href: "/design", label: "Design" },
  { href: "/produk", label: "Produk" },
  { href: "/purchasing", label: "Purchasing" },
];

export default function TopBar({
  fullName,
  role,
  userId,
}: {
  fullName: string;
  role: Role;
  userId: string;
}) {
  const pathname = usePathname();
  const currentSection = "/" + (pathname?.split("/")[1] ?? "");

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-8 sm:pt-8">
      <p className="text-sm text-inkfaint">
        Selamat Datang, <span className="text-ink">{fullName.split(" ")[0]}</span>
      </p>

      {/* Di HP, pill role pindah ke baris sendiri di bawah dan bisa digeser ke samping. */}
      {role === "admin" && (
        <div className="order-last flex basis-full items-center gap-1 overflow-x-auto sm:order-none sm:basis-auto">
          {ADMIN_SWITCHER.map((s) => {
            const active = currentSection === s.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition sm:px-4 ${
                  active
                    ? "bg-gradient-to-r from-press to-pressdark text-white shadow-sm"
                    : "text-ink hover:bg-ink/5"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 sm:gap-4">
        {role !== "admin" && <NotificationBell userId={userId} role={role} />}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-ink">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" strokeLinecap="round" />
            </svg>
          </div>
          {/* Nama lengkap disembunyikan di HP; sapaan di kiri sudah menampilkan nama depan. */}
          <span className="hidden font-mono text-xs text-ink sm:inline">{fullName}</span>
        </div>
      </div>
    </div>
  );
}