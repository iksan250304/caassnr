"use client";

import { createClient } from "@/lib/supabase/client";
import { Role } from "@/lib/types";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import NotificationBell from "./NotificationBell";

const SECTION_TITLE: Record<string, string> = {
  "/design": "Meja Desain",
  "/produk": "Meja Produk",
  "/purchasing": "Meja Purchasing",
  "/admin": "Panel Admin",
};

const ADMIN_SWITCHER_LINKS: { href: string; label: string }[] = [
  { href: "/design", label: "Design" },
  { href: "/produk", label: "Produk" },
  { href: "/purchasing", label: "Purchasing" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar({
  role,
  fullName,
  userId,
}: {
  role: Role;
  fullName: string;
  userId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const currentSection = "/" + (pathname?.split("/")[1] ?? "");
  const title = SECTION_TITLE[currentSection] ?? SECTION_TITLE["/" + role] ?? "CAAS";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
            <Image
              src="/icon-sansico.png"
              alt="Sansico Medica"
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="font-display text-sm tracking-tight text-ink">
              CAAS
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
              {title}
              {role === "admin" && (
                <span className="ml-1.5 text-proof">(mode admin)</span>
              )}
            </p>
          </div>
        </div>

        {role === "admin" && (
          <nav className="flex items-center gap-1">
            {ADMIN_SWITCHER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                  currentSection === link.href
                    ? "bg-ink text-paper"
                    : "border border-ink/20 text-ink hover:border-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {role !== "admin" && <NotificationBell userId={userId} role={role} />}
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