import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Merge in "deactivated" (banned) status from Auth, since that lives outside
  // the profiles table.
  const adminClient = createAdminClient();
  const { data: authList } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });
  const bannedIds = new Set(
    (authList?.users ?? [])
      .filter((u: any) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u: any) => u.id)
  );

  const users = (profiles ?? []).map((p) => ({
    ...p,
    deactivated: bannedIds.has(p.id),
  }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, password, full_name, role } = await req.json();
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Field tidak lengkap." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Gagal membuat user." },
      { status: 400 }
    );
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    full_name,
    role,
  });

  if (profileError) {
    // rollback the auth user if profile insert fails
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}