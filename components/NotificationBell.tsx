"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppNotification, Role } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

const TYPE_LINK: Record<string, string> = {
  new_submission: "/produk",
  resubmitted: "/produk",
  ready_to_print: "/purchasing",
  revision_needed: "/design",
  reminder: "", // ditentukan per-role saat render
};

export default function NotificationBell({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const lastSeenRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "off" | "on">("off");
  const [pushBusy, setPushBusy] = useState(false);

  const roleHome: Record<Role, string> = {
    design: "/design",
    product: "/produk",
    purchasing: "/purchasing",
    admin: "/admin",
  };

  async function loadInitial() {
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_notifications_seen_at")
      .eq("id", userId)
      .single();
    const lastSeen = profile?.last_notifications_seen_at ?? new Date(0).toISOString();
    lastSeenRef.current = lastSeen;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`recipient_id.eq.${userId},target_role.eq.${role}`)
      .order("created_at", { ascending: false })
      .limit(20);

    const list = (data as AppNotification[]) ?? [];
    setItems(list);
    setUnreadCount(list.filter((n) => n.created_at > lastSeen).length);
  }

  useEffect(() => {
    loadInitial();
    checkPushStatus();

    // Dua channel terpisah: notif yang ditujukan ke saya langsung, dan notif
    // yang di-broadcast ke seluruh role saya (realtime filter cuma bisa 1 kolom).
    const channelUser = supabase
      .channel(`notif-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        (payload) => handleIncoming(payload.new as AppNotification)
      )
      .subscribe();

    const channelRole = supabase
      .channel(`notif-role-${role}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `target_role=eq.${role}` },
        (payload) => handleIncoming(payload.new as AppNotification)
      )
      .subscribe();

    function handleIncoming(n: AppNotification) {
      setItems((prev) => [n, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);
      setToasts((prev) => [...prev, n]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== n.id));
      }, 6000);
    }

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      supabase.removeChannel(channelUser);
      supabase.removeChannel(channelRole);
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      const now = new Date().toISOString();
      await supabase.from("profiles").update({ last_notifications_seen_at: now }).eq("id", userId);
      lastSeenRef.current = now;
      setUnreadCount(0);
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function checkPushStatus() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      setPushStatus(existing ? "on" : "off");
    } catch {
      setPushStatus("off");
    }
  }

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Buang subscription lama (kalau ada) supaya selalu dapat subscription
      // baru yang pasti valid — subscription lama bisa saja sudah kedaluwarsa
      // di sisi Google/Mozilla walau browser masih menganggapnya ada.
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID key belum diatur di environment.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        { onConflict: "endpoint" }
      );
      setPushStatus("on");
    } catch (err) {
      console.error(err);
    } finally {
      setPushBusy(false);
    }
  }

  function linkFor(n: AppNotification) {
    if (n.type === "reminder") return roleHome[role];
    return TYPE_LINK[n.type] || roleHome[role];
  }

  return (
    <>
      {/* Toast popup — muncul sementara saat notif baru masuk real-time */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-xs border border-ink bg-paper px-4 py-3 shadow-lg"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-proof">
              Notifikasi Baru
            </p>
            <p className="mt-1 text-sm text-ink">{t.message}</p>
          </div>
        ))}
      </div>

      <div ref={dropdownRef} className="relative">
        <button
          onClick={handleToggle}
          className="relative border border-ink/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:border-proof hover:text-proof"
        >
          Notifikasi
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-press px-1 text-[10px] text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto border border-ink/15 bg-paper shadow-lg">
            <p className="border-b border-ink/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-inkfaint">
              Notifikasi
            </p>
            {pushStatus === "off" && (
              <div className="border-b border-ink/10 bg-proof/5 px-4 py-2">
                <button
                  onClick={handleEnablePush}
                  disabled={pushBusy}
                  className="font-mono text-[10px] uppercase tracking-wider text-proof hover:underline disabled:opacity-50"
                >
                  {pushBusy ? "Mengaktifkan…" : "🔔 Aktifkan Notifikasi Desktop"}
                </button>
              </div>
            )}
            {pushStatus === "on" && (
              <div className="border-b border-ink/10 bg-approve/5 px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-approve">
                  ✓ Notifikasi Desktop Aktif
                </span>
                <button
                  onClick={handleEnablePush}
                  disabled={pushBusy}
                  className="font-mono text-[10px] uppercase tracking-wider text-inkfaint hover:text-ink disabled:opacity-50"
                  title="Buat ulang subscription kalau notif tiba-tiba berhenti masuk"
                >
                  {pushBusy ? "Memperbarui…" : "Perbarui"}
                </button>
              </div>
            )}
            {pushStatus === "denied" && (
              <p className="border-b border-ink/10 px-4 py-2 font-mono text-[10px] text-inkfaint">
                Notifikasi desktop diblokir di browser. Aktifkan lewat pengaturan izin situs.
              </p>
            )}
            {!items.length && (
              <p className="px-4 py-6 text-center font-mono text-xs text-inkfaint">
                Belum ada notifikasi.
              </p>
            )}
            {items.map((n) => (
              <a
                key={n.id}
                href={linkFor(n)}
                className="block border-b border-ink/5 px-4 py-3 text-sm hover:bg-stock last:border-0"
              >
                <p className="text-ink">{n.message}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-inkfaint">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: localeId })}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}