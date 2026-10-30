"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { useLoginPrompt } from "../auth";

type Event = { id: string; title: string; date: string; location: string; description: string };
const dateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function KalenderView() {
  const { user } = useStore();
  const login = useLoginPrompt();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const year = month.getFullYear(), index = month.getMonth();
  const days = new Date(year, index + 1, 0).getDate();
  const offset = new Date(year, index, 1).getDay();
  useEffect(() => {
    if (!user) { setEvents([]); return; }
    let cancelled = false;
    setLoading(true); setError(false); setEvents([]);
    (async () => {
      const items: Event[] = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await getSupabase().from("kegiatan").select("id,title,date,location,description").eq("status", "published").gte("date", dateKey(year, index, 1)).lte("date", dateKey(year, index, days)).order("date").order("id").range(start, start + 99);
        if (cancelled) return;
        if (error) { setError(true); setLoading(false); return; }
        items.push(...(data ?? []) as Event[]);
        if ((data?.length ?? 0) < 100) break;
      }
      if (!cancelled) { setEvents(items); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, year, index, days, attempt]);

  return <>
    <PageHeader eyebrow="Agenda Warga" title="Kalender Kegiatan" description="Lihat kegiatan warga yang telah diterbitkan." />
    {!user ? <section className="card p-6 text-center"><CalendarDays className="mx-auto mb-3 size-8 text-maroon-700" /><h2 className="font-semibold">Masuk untuk melihat kalender</h2><p className="mt-2 text-sm text-concrete-600">Gunakan akun warga untuk melihat jadwal kegiatan.</p><Button className="mt-4" onClick={() => login("Masuk untuk melihat kalender kegiatan")}>Masuk</Button></section> : <>
      <section className="card p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-2"><Button variant="outline" size="sm" aria-label="Bulan sebelumnya" onClick={() => setMonth(new Date(year, index - 1, 1))}><ChevronLeft className="size-4" /></Button><h2 className="text-center font-semibold">{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month)}</h2><Button variant="outline" size="sm" aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(year, index + 1, 1))}><ChevronRight className="size-4" /></Button></div>
        {error ? <div role="alert" className="py-8 text-center text-sm">Gagal memuat kegiatan. <button className="text-maroon-700 underline" onClick={() => setAttempt((n) => n + 1)}>Coba lagi</button></div> : loading ? <p className="py-8 text-center text-sm" role="status">Memuat kegiatan…</p> : <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-concrete-500">{["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => <span key={d} className="py-2">{d}</span>)}
            {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
            {Array.from({ length: days }, (_, i) => { const day = i + 1; const count = events.filter((event) => event.date === dateKey(year, index, day)).length; return <div key={day} className={`min-h-12 rounded-lg p-1 text-sm ${count ? "bg-maroon-50 font-semibold text-maroon-700" : "bg-concrete-50 text-concrete-600"}`} aria-label={`${day}: ${count} kegiatan`}><span>{day}</span>{count > 0 && <span className="block text-[10px]">{count} kegiatan</span>}</div>; })}
          </div>
          <h3 className="mt-6 font-semibold">Kegiatan bulan ini</h3>
          {events.length ? <ul className="mt-3 divide-y divide-concrete-100">{events.map((event) => <li key={event.id} className="py-3"><div className="text-xs font-semibold text-maroon-700">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${event.date}T00:00:00Z`))}</div><div className="mt-1 font-semibold">{event.title}</div><p className="text-sm text-concrete-600">{event.location}</p><p className="mt-1 whitespace-pre-wrap text-sm text-concrete-600">{event.description}</p></li>)}</ul> : <p className="mt-3 text-sm text-concrete-500">Belum ada kegiatan yang diterbitkan pada bulan ini.</p>}
        </>}
      </section><p className="mt-4 text-sm text-concrete-600">Ingin mengirim kegiatan? <Link href="/warga/kegiatan" className="font-semibold text-maroon-700 underline">Buka halaman kegiatan</Link>.</p>
    </>}
  </>;
}
