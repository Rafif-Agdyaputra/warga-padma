"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

type Result = { id: string; title: string; detail: string; extra: string; kind: string; href: string };
const PAGE = 10;

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
    <button type="button" onClick={() => setOpen(true)} aria-label="Cari di portal" className="flex h-9 items-center gap-2 rounded-full border border-concrete-200 bg-white px-3 text-sm text-concrete-600 hover:text-maroon-700"><Search className="size-4" /><span className="hidden xl:inline">Cari</span></button>
    <Modal open={open} onClose={() => setOpen(false)} title="Cari di portal" subtitle="Pengumuman, kegiatan, UMKM, dan kontak" size="lg">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setLimit(PAGE); setTerm(query.trim().slice(0, 100)); setRetry((n) => n + 1); }}><Input type="search" aria-label="Kata pencarian" placeholder="Cari nama, judul, atau kata kunci…" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} /><Button type="submit" disabled={!query.trim()}>Cari</Button></form>
      <div className="mt-4" aria-live="polite">
        {loading && <p className="text-sm text-concrete-500">Mencari…</p>}
        {error && <p role="alert" className="text-sm text-maroon-700">Pencarian gagal. <button className="underline" onClick={() => setRetry((n) => n + 1)}>Coba lagi</button></p>}
        {!loading && !error && term && results.length === 0 && <p className="text-sm text-concrete-500">Tidak ada hasil untuk “{term}”.</p>}
        {!error && <div className="space-y-2">{results.map((item) => <details key={`${item.kind}-${item.id}`} className="rounded-xl border border-concrete-200 bg-white p-3"><summary className="cursor-pointer"><span className="block text-xs font-semibold text-maroon-700">{item.kind} · {item.extra}</span><span className="font-semibold text-concrete-900">{item.title}</span></summary>{item.detail && <p className="mt-2 whitespace-pre-wrap text-sm text-concrete-600">{item.detail}</p>}<Link href={item.href} onClick={() => setOpen(false)} className="mt-3 inline-block text-sm font-semibold text-maroon-700 underline">Buka halaman {item.kind.toLowerCase()}</Link></details>)}</div>}
        {more && !error && <button disabled={loading} className="mt-4 text-sm font-semibold text-maroon-700 underline disabled:opacity-50" onClick={() => setLimit((n) => n + PAGE)}>Muat lebih banyak hasil</button>}
      </div>
    </Modal>
  </>;
}
