"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, Megaphone, CalendarDays, Store, Phone, ChevronDown, ArrowUpRight, SearchX } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

type Result = { id: string; title: string; detail: string; extra: string; kind: string; href: string };
const PAGE = 10;
const categories = [
  { name: "Pengumuman", icon: Megaphone, color: "bg-maroon-50 text-maroon-700" },
  { name: "Kegiatan", icon: CalendarDays, color: "bg-amber-50 text-amber-600" },
  { name: "UMKM", icon: Store, color: "bg-sage-50 text-sage-600" },
  { name: "Kontak", icon: Phone, color: "bg-concrete-100 text-concrete-600" },
] as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [results, setResults] = useState<Result[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    if (!open || !term) { setResults([]); setMore(false); setLoading(false); return; }
    setLoading(true); setError(false);
    const sb = getSupabase();
    // Escape PostgREST filter syntax before constructing the OR expression.
    const value = term.replace(/[\\%_]/g, "\\$&").replace(/[(),."]/g, " ").trim();
    if (!value) { setResults([]); setMore(false); setLoading(false); return; }
    const pattern = `%${value}%`;
    (async () => {
      try {
        const replies = await Promise.all([
          sb.from("pengumuman").select("id,title,content,category").eq("status", "published").or(`title.ilike.${pattern},content.ilike.${pattern}`).order("date", { ascending: false }).order("id").range(0, limit),
          sb.from("kegiatan").select("id,title,description,location").eq("status", "published").or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`).order("date", { ascending: false }).order("id").range(0, limit),
          sb.from("umkm").select("id,name,description,category").eq("status", "published").or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`).order("name").order("id").range(0, limit),
          sb.from("kontak").select("id,name,phone,note,group").or(`name.ilike.${pattern},phone.ilike.${pattern},note.ilike.${pattern}`).order("name").order("id").range(0, limit),
        ]);
        if (id !== request.current) return;
        if (replies.some((r) => r.error)) throw new Error("Pencarian gagal");
        const announcements = replies[0].data ?? [];
        const events = replies[1].data ?? [];
        const businesses = replies[2].data ?? [];
        const contacts = replies[3].data ?? [];
        setMore(replies.some((r) => (r.data?.length ?? 0) > limit));
        setResults([
          ...announcements.slice(0, limit).map((r) => ({ id: r.id, title: r.title, detail: r.content, extra: r.category, kind: "Pengumuman", href: "/warga/pengumuman" })),
          ...events.slice(0, limit).map((r) => ({ id: r.id, title: r.title, detail: r.description, extra: r.location, kind: "Kegiatan", href: "/warga/kegiatan" })),
          ...businesses.slice(0, limit).map((r) => ({ id: r.id, title: r.name, detail: r.description, extra: r.category, kind: "UMKM", href: "/warga/umkm" })),
          ...contacts.slice(0, limit).map((r) => ({ id: r.id, title: r.name, detail: r.note ?? "", extra: `${r.group} · ${r.phone}`, kind: "Kontak", href: "/warga/kontak" })),
        ]);
      } catch { if (id === request.current) setError(true); }
      finally { if (id === request.current) setLoading(false); }
    })();
    return () => { request.current++; };
  }, [open, term, limit, retry]);

  return <>
    {!open && <button type="button" onClick={() => setOpen(true)} aria-label="Cari di portal" className="flex h-9 items-center gap-2 rounded-full border border-concrete-200 bg-white px-3 text-sm text-concrete-600 hover:text-maroon-700"><Search className="size-4" /><span className="hidden xl:inline">Cari</span></button>}
    {open && <div className="absolute left-4 right-4 top-3 z-50 md:left-auto md:right-6 md:w-[min(36rem,calc(100vw-3rem))] md:top-4" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <div className="overflow-hidden rounded-2xl border border-concrete-200/80 bg-white p-2 shadow-lift">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setLimit(PAGE); setTerm(query.trim().slice(0, 100)); setRetry((n) => n + 1); }}><Input autoFocus type="search" aria-label="Kata pencarian" placeholder="Cari nama, judul, atau kata kunci…" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} /><Button type="submit" disabled={!query.trim()}>Cari</Button><button type="button" aria-label="Tutup pencarian" onClick={() => setOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-xl text-concrete-500 hover:bg-concrete-100"><X className="size-4" /></button></form>
      <div className="max-h-[65vh] overflow-y-auto" aria-live="polite">
        {loading && <p className="px-3 py-5 text-sm text-concrete-500">Mencari…</p>}
        {error && <p role="alert" className="px-3 py-5 text-sm text-maroon-700">Pencarian gagal. <button className="font-semibold underline" onClick={() => setRetry((n) => n + 1)}>Coba lagi</button></p>}
        {!loading && !error && term && results.length === 0 && <div className="flex flex-col items-center px-5 py-9 text-center"><span className="grid size-11 place-items-center rounded-2xl bg-concrete-100 text-concrete-400"><SearchX className="size-5" /></span><p className="mt-3 text-sm font-semibold text-concrete-800">Belum ada hasil</p><p className="mt-1 text-xs text-concrete-500">Tidak ditemukan hasil untuk “{term}”. Coba kata kunci lain.</p></div>}
        {!error && results.length > 0 && <div className="px-1 pb-1 pt-3"><p className="px-3 pb-2 text-xs text-concrete-500">Hasil untuk <span className="font-semibold text-concrete-700">“{term}”</span> · {results.length} ditampilkan</p>{categories.map(({ name, icon: Icon, color }) => {
          const group = results.filter((item) => item.kind === name);
          if (!group.length) return null;
          return <section key={name} className="mt-2"><h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-concrete-400">{name}</h3><div className="space-y-1">{group.map((item) => <details key={item.id} className="group rounded-xl transition-colors open:bg-concrete-50 hover:bg-concrete-50"><summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl px-3 py-3 focus-visible:outline-2 focus-visible:outline-maroon-700 [&::-webkit-details-marker]:hidden"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${color}`}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-concrete-900">{item.title}</span><span className="mt-0.5 block truncate text-xs text-concrete-500">{item.extra}</span></span><ChevronDown className="mt-2 size-4 shrink-0 text-concrete-400 transition-transform group-open:rotate-180" /></summary><div className="pb-3 pl-[60px] pr-4">{item.detail && <p className="whitespace-pre-wrap text-sm leading-relaxed text-concrete-600">{item.detail}</p>}<Link href={item.href} onClick={() => setOpen(false)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 hover:underline">Buka halaman {item.kind.toLowerCase()} <ArrowUpRight className="size-3.5" /></Link></div></details>)}</div></section>;
        })}</div>}
        {more && !error && <div className="border-t border-concrete-100 p-3 text-center"><button disabled={loading} className="rounded-full px-4 py-2 text-sm font-semibold text-maroon-700 transition hover:bg-maroon-50 disabled:opacity-50" onClick={() => setLimit((n) => n + PAGE)}>Muat lebih banyak hasil</button></div>}
      </div>
      </div>
    </div>}
  </>;
}
