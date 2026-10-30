"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { useLoginPrompt } from "./auth";

export function NotificationBell() {
  const { user } = useStore();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!user) { setCount(null); return; }
    let cancelled = false;
    const load = async () => {
      const { count, error } = await getSupabase().from("notifikasi").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
      if (!cancelled) setCount(error ? null : count ?? 0);
    };
    void load();
    const timer = window.setInterval(load, 60000);
    const update = () => void load();
    window.addEventListener("notifications-changed", update);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("notifications-changed", update); };
  }, [user]);
  if (!user) return null;
  return <Link href="/warga/notifikasi" aria-label={count ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"} className="relative grid size-9 place-items-center rounded-full border border-concrete-200 bg-white text-concrete-600 hover:text-maroon-700"><Bell className="size-4" />{count !== null && count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-maroon-700 px-1 text-center text-[10px] font-semibold text-white">{count > 99 ? "99+" : count}</span>}</Link>;
}

type Notification = { id: string; title: string; message: string; target: string; read_at: string | null; created_at: string };
export function NotificationView() {
  const { user } = useStore();
  const login = useLoginPrompt();
  const [items, setItems] = useState<Notification[]>([]);
  const request = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const [more, setMore] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    const requestId = ++request.current;
    setLoading(true); setError(null);
    const { data, error } = await getSupabase().from("notifikasi").select("id,title,message,target,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(0, limit);
    if (requestId !== request.current) return;
    if (error) setError("Notifikasi tidak dapat dimuat. Coba lagi.");
    else { setItems((data ?? []).slice(0, limit) as Notification[]); setMore((data?.length ?? 0) > limit); }
    setLoading(false);
  }, [user, limit]);
  useEffect(() => { setItems([]); void load(); return () => { request.current++; }; }, [load]);
  const markRead = async (id: string) => {
    const readAt = new Date().toISOString();
    const { error } = await getSupabase().from("notifikasi").update({ read_at: readAt }).eq("id", id).is("read_at", null);
    if (error) { setError("Tidak dapat menandai notifikasi sebagai dibaca. Coba lagi."); return; }
    setItems((old) => old.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
    window.dispatchEvent(new Event("notifications-changed"));
  };
  return <><PageHeader eyebrow="Akun Warga" title="Notifikasi" description="Pembaruan akun dan kiriman Anda." />
    {!user ? <div className="card p-6"><p>Masuk untuk melihat notifikasi Anda.</p><button onClick={() => login("Masuk untuk melihat notifikasi")} className="mt-3 font-semibold text-maroon-700 underline">Masuk</button></div> : <div className="card divide-y divide-concrete-100">
      {error && <p role="alert" className="p-4 text-sm text-maroon-700">{error} <button className="underline" onClick={() => void load()}>Coba lagi</button></p>}
      {loading && <p role="status" className="p-4 text-sm">Memuat notifikasi…</p>}
      {!loading && !error && items.length === 0 && <p className="p-6 text-sm text-concrete-500">Belum ada notifikasi.</p>}
      {items.map((item) => <article key={item.id} className={`p-4 ${item.read_at ? "" : "bg-maroon-50/50"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}{!item.read_at && <span className="ml-2 text-xs text-maroon-700">Baru</span>}</p><p className="mt-1 text-sm text-concrete-600">{item.message}</p><time dateTime={item.created_at} className="mt-1 block text-xs text-concrete-500">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(item.created_at))} WIB</time></div></div><div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-maroon-700"><Link href={item.target} className="underline">Lihat halaman</Link>{!item.read_at && <button className="underline" onClick={() => void markRead(item.id)}>Tandai dibaca</button>}</div></article>)}
      {more && <div className="p-4"><button className="text-sm font-semibold text-maroon-700 underline" disabled={loading} onClick={() => setLimit((n) => n + 30)}>Muat lebih banyak</button></div>}
    </div>}
  </>;
}
