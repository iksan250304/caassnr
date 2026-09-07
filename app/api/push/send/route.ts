import { NextRequest, NextResponse } from "next/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { sendPushForNotification, NotificationRecord } from "@/lib/push";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  const secretOk = !!process.env.PUSH_WEBHOOK_SECRET && secret === process.env.PUSH_WEBHOOK_SECRET;

  if (!secretOk) {
    // Bukan panggilan server-ke-server (cron) — verifikasi token akses user yang
    // dikirim dari browser persis setelah insert notifikasi.
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const record = body.record as NotificationRecord;
  if (!record) return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });

  const result = await sendPushForNotification(record);
  return NextResponse.json({ ok: true, ...result });
}