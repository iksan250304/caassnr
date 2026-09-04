import { createClient } from "@/lib/supabase/client";
import { NotificationType, Role } from "./types";

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
}