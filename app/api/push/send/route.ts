import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

const TYPE_TITLE: Record<string, string> = {
  new_submission: "Artwork Baru",
  resubmitted: "Revisi Dikirim",
  revision_needed: "Perlu Revisi",
  ready_to_print: "Siap Cetak",
  reminder: "Pengingat",
};

const TYPE_LINK: Record<string, string> = {
  new_submission: "/produk",
  resubmitted: "/produk",
  ready_to_print: "/purchasing",
  revision_needed: "/design",
};

const ROLE_HOME: Record<string, string> = {
  design: "/design",
  product: "/produk",
  purchasing: "/purchasing",
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!process.env.PUSH_WEBHOOK_SECRET || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID keys belum diatur" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const body = await req.json();
  const record = body.record as {
    target_role: string | null;
    recipient_id: string | null;
    type: string;
    message: string;
  };
  if (!record) return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });

  const adminClient = createAdminClient();

  let userIds: string[] = [];
  if (record.recipient_id) {
    userIds = [record.recipient_id];
  } else if (record.target_role) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", record.target_role);
    userIds = (profiles ?? []).map((p: any) => p.id);
  }

  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 });

  const { data: subs } = await adminClient
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  const payload = JSON.stringify({
    title: TYPE_TITLE[record.type] ?? "CAAS",
    body: record.message,
    url:
      TYPE_LINK[record.type] ??
      (record.target_role ? ROLE_HOME[record.target_role] : undefined) ??
      "/",
  });

  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (err: any) {
      // Subscription kedaluwarsa/dicabut user — bersihkan dari DB.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await adminClient.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, targeted: userIds.length });
}