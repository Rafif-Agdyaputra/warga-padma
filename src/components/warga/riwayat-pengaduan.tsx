"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

type Entry = { id: number; status: "draft" | "published" | "rejected"; progress: "diterima" | "diproses" | "selesai"; response: string | null; created_at: string };
const statusLabels = { draft: "Menunggu peninjauan", published: "Ditayangkan", rejected: "Ditolak" };
const progressLabels = { diterima: "Diterima", diproses: "Diproses", selesai: "Selesai" };

export function RiwayatPengaduan({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const load = async () => {
    setLoading(true); setError(false);
    const { data, error } = await getSupabase().from("pengaduan_riwayat").select("id,status,progress,response,created_at").eq("pengaduan_id", id).order("created_at", { ascending: false }).order("id", { ascending: false });
    if (error) setError(true); else setEntries((data ?? []) as Entry[]);
    setLoading(false);
  };
  return <div className="mt-4 border-t border-concrete-100 pt-3">
    <button type="button" className="text-sm font-semibold text-maroon-700 underline" aria-expanded={open} onClick={() => { if (!open) void load(); setOpen(!open); }}>
      {open ? "Tutup riwayat" : "Lihat riwayat dan pembaruan"}
    </button>
    {open && <div className="mt-3 text-sm" aria-live="polite">
      {loading ? <p>Memuat riwayat…</p> : error ? <p>Riwayat gagal dimuat. <button className="underline" onClick={() => void load()}>Coba lagi</button></p> : entries.length === 0 ? <p>Belum ada riwayat.</p> : <ol className="space-y-3">{entries.map((entry) => <li key={entry.id} className="rounded-xl bg-concrete-50 p-3">
        <p className="font-semibold">{statusLabels[entry.status]} · {progressLabels[entry.progress]}</p>
        <time className="text-xs text-concrete-500" dateTime={entry.created_at}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(entry.created_at))} WIB</time>
        {entry.response && <p className="mt-1">Tanggapan pengurus: {entry.response}</p>}
      </li>)}</ol>}
    </div>}
  </div>;
}
