import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPushForNotification } from "@/lib/push";

// Dipanggil Vercel Cron jam 09:00 & 14:00 WIB, Senin-Jumat (lihat vercel.json).
// Hanya kirim reminder kalau memang ADA pekerjaan pending di role tersebut,
// supaya tidak spam kalau semua sudah beres.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: Record<string, number> = {};

  // Produk: reminder ke seluruh role kalau ada antrean pending_product
  const { count: pendingProductCount } = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_product");

  if ((pendingProductCount ?? 0) > 0) {
    const message = `Pengingat: ada ${pendingProductCount} artwork menunggu review Anda.`;
    await supabase.from("notifications").insert({
      target_role: "product",
      type: "reminder",
      message,
    });
    await sendPushForNotification({ target_role: "product", recipient_id: null, type: "reminder", message });
  }
  results.pendingProductCount = pendingProductCount ?? 0;

  // Purchasing: reminder ke seluruh role kalau ada approved_product menunggu naik cetak
  const { count: readyToPrintCount } = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved_product");

  if ((readyToPrintCount ?? 0) > 0) {
    const message = `Pengingat: ada ${readyToPrintCount} artwork siap dinaikkan cetak.`;
    await supabase.from("notifications").insert({
      target_role: "purchasing",
      type: "reminder",
      message,
    });
    await sendPushForNotification({ target_role: "purchasing", recipient_id: null, type: "reminder", message });
  }
  results.readyToPrintCount = readyToPrintCount ?? 0;

  // Design: reminder PER-INDIVIDU untuk masing-masing yang punya artwork rejected_product
  const { data: rejectedArtworks } = await supabase
    .from("artworks")
    .select("created_by")
    .eq("status", "rejected_product");

  const counts: Record<string, number> = {};
  for (const row of rejectedArtworks ?? []) {
    counts[row.created_by] = (counts[row.created_by] ?? 0) + 1;
  }

  const inserts = Object.entries(counts).map(([userId, count]) => ({
    recipient_id: userId,
    type: "reminder" as const,
    message: `Pengingat: Anda punya ${count} artwork yang perlu direvisi.`,
  }));

  if (inserts.length) {
    await supabase.from("notifications").insert(inserts);
    for (const row of inserts) {
      await sendPushForNotification({
        target_role: null,
        recipient_id: row.recipient_id,
        type: row.type,
        message: row.message,
      });
    }
  }
  results.designRemindersSent = inserts.length;

  return NextResponse.json({ ok: true, ...results });
}