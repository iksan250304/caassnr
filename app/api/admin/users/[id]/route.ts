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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { full_name, role, reactivate, new_password } = await req.json();
  const adminClient = createAdminClient();

  if (full_name !== undefined || role !== undefined) {
    const { error } = await adminClient
      .from("profiles")
      .update({ full_name, role })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (reactivate) {
    const { error } = await adminClient.auth.admin.updateUserById(params.id, {
      ban_duration: "none",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (new_password) {
    if (String(new_password).length < 6) {
      return NextResponse.json(
        { error: "Sandi baru minimal 6 karakter." },
        { status: 400 }
      );
    }
    const { error } = await adminClient.auth.admin.updateUserById(params.id, {
      password: new_password,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (admin.id === params.id) {
    return NextResponse.json(
      { error: "Tidak dapat menghapus akun sendiri." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // A user who has ever submitted an artwork or logged an approval/reject/print
  // action cannot be hard-deleted: their id is still referenced by artworks.created_by
  // or approval_logs.actor_id, and removing it would corrupt the audit trail the
  // PRD requires. In that case we deactivate the login instead of deleting the row.
  const [{ count: artworkCount }, { count: logCount }] = await Promise.all([
    adminClient
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("created_by", params.id),
    adminClient
      .from("approval_logs")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", params.id),
  ]);

  const hasHistory = (artworkCount ?? 0) > 0 || (logCount ?? 0) > 0;

  if (hasHistory) {
    const { error } = await adminClient.auth.admin.updateUserById(params.id, {
      ban_duration: "876000h", // effectively permanent (100 years)
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      ok: true,
      deactivated: true,
      message:
        "User memiliki riwayat artwork/approval sehingga tidak dihapus permanen — akun dinonaktifkan (tidak bisa login lagi) agar audit trail tetap utuh.",
    });
  }

  const { error } = await adminClient.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, deactivated: false });
}
