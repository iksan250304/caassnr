import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Role } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar role={profile.role as Role} />
      {/* Gradient penuh dari merah (kanan atas) memudar ke putih (kiri bawah),
          sebagai latar tempat kartu glassmorphism "mengambang". */}
      <div className="relative flex flex-1 flex-col overflow-x-hidden bg-gradient-to-bl from-press/25 via-press/5 to-white">
        <TopBar fullName={profile.full_name} role={profile.role as Role} userId={user.id} />
        <main className="relative flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}