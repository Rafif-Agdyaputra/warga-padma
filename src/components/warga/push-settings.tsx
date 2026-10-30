"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui";

function decodeKey(key: string) {
  const encoded = (key + "=".repeat((4 - key.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
}
export function PushSettings() {
  const { user } = useStore();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  useEffect(() => {
    if (!user || !supported) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { if (!cancelled) setEnabled(false); return; }
        const { data, error } = await getSupabase().from("push_subscriptions").select("id").eq("endpoint", sub.endpoint).eq("user_id", user.id).maybeSingle();
        if (!cancelled) { setEnabled(!!data); if (error) setMessage("Status notifikasi tidak dapat dimuat."); }
      } catch { if (!cancelled) setMessage("Status notifikasi tidak dapat dimuat."); }
    })();
    return () => { cancelled = true; };
  }, [user, supported]);
  if (!user) return null;
  const enable = async () => {
    if (!publicKey) { setMessage("Notifikasi push belum dikonfigurasi pengurus."); return; }
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Izin notifikasi belum diberikan. Periksa pengaturan perangkat.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
      const json = sub.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth) throw new Error("Data perangkat tidak lengkap.");
      const { error } = await getSupabase().from("push_subscriptions").upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth_key: json.keys.auth }, { onConflict: "endpoint" });
      if (error) throw new Error("Perangkat gagal didaftarkan. Jika perangkat dipakai akun lain, nonaktifkan notifikasi di akun tersebut terlebih dahulu.");
      setEnabled(true); setMessage("Notifikasi push aktif pada perangkat ini.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Notifikasi tidak dapat diaktifkan."); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true); setMessage("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const { error } = await getSupabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint).eq("user_id", user.id);
        if (error) throw error;
        await sub.unsubscribe();
      }
      setEnabled(false); setMessage("Notifikasi push dinonaktifkan pada perangkat ini.");
    } catch { setMessage("Notifikasi tidak dapat dinonaktifkan. Coba lagi."); }
    finally { setBusy(false); }
  };
  return <section className="card p-5"><h2 className="font-semibold">Notifikasi perangkat</h2><p className="mt-1 text-sm text-concrete-600">Terima pemberitahuan akun, kiriman, dan pengaduan pada perangkat ini.</p>{supported ? <Button className="mt-3" variant="outline" disabled={busy} onClick={() => void (enabled ? disable() : enable())}>{busy ? "Memproses…" : enabled ? "Nonaktifkan notifikasi" : "Aktifkan notifikasi"}</Button> : <p className="mt-2 text-sm text-concrete-500">Perangkat ini belum mendukung notifikasi di tampilan ini. Di iPhone, tambahkan aplikasi ke layar utama lalu buka dari sana.</p>}{message && <p role="status" className="mt-2 text-sm text-concrete-600">{message}</p>}</section>;
}
