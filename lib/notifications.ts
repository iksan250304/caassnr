import { createClient } from "@/lib/supabase/client";
import { NotificationType, Role } from "./types";

async function triggerPush(record: {
  target_role: string | null;
  recipient_id: string | null;
  type: NotificationType;
  message: string;
}) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch("/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ record }),
    });
  } catch {
    // Push notification gagal terkirim tidak boleh mengganggu alur utama —
    // notifikasi in-app (bell/toast) tetap sudah tersimpan di database.
  }
}

export async function notifyRole(
  targetRole: Role,
  type: NotificationType,
  message: string,
  artworkId?: string
) {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    target_role: targetRole,
    type,
    message,
    artwork_id: artworkId ?? null,
  });
  await triggerPush({ target_role: targetRole, recipient_id: null, type, message });
}

export async function notifyUser(
  recipientId: string,
  type: NotificationType,
  message: string,
  artworkId?: string
) {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    recipient_id: recipientId,
    type,
    message,
    artwork_id: artworkId ?? null,
  });
  await triggerPush({ target_role: null, recipient_id: recipientId, type, message });
}