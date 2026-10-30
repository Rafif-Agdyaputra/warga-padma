"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Home, Lock, MessageCircle, Minus, MousePointerClick, Phone, Plus, Search, Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useMediaQuery } from "@/lib/hooks";
import { cn, waLink } from "@/lib/utils";
import type { House, HouseStatus } from "@/lib/types";
import { Badge, Input, Modal, PageHeader } from "@/components/ui";
import { HouseMap, statusStyle } from "../house-map";
import { useLoginPrompt } from "../auth";

function HouseDetail({ h }: { h: House }) {
  const { user, isVerified } = useStore();
  const prompt = useLoginPrompt();
  const s = statusStyle[h.status];
  const hasPhone = !!h.phone && h.phone !== "-";
  const rows = [
    { k: "Pemilik", v: h.owner, dummy: "Nama Pemilik Rumah", icon: Home },
    { k: "Akun / penghuni", v: h.penghuni ? `${h.penghuni}` : "-", dummy: "0 orang", icon: Users },
    { k: "Telepon", v: h.phone, dummy: "0812-0000-0000", icon: Phone },
  ];

  return (
    <div className="animate-rise">
      <div className="relative overflow-hidden rounded-2xl bg-concrete-900 p-5 text-white">
        <div className="bg-blueprint-dark absolute inset-0" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">Unit Rumah</div>
            <div className="mt-1 font-display text-4xl font-semibold">{h.label || <>{h.blok}<span className="text-amber-400">-</span>{h.nomor}</>}</div>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            <span className={cn("mr-1.5 inline-block size-1.5 rounded-full", s.dot)} />{s.label}
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <dl className={cn("divide-y divide-concrete-100 rounded-2xl border border-concrete-200", !isVerified && "select-none")} aria-hidden={!isVerified}>
          {rows.map((r) => (
            <div key={r.k} className="flex items-center gap-3 px-4 py-3">
              <r.icon className="size-4 text-concrete-400" />
              <dt className="text-sm text-concrete-500">{r.k}</dt>
              {/* data asli tidak pernah dikirim ke non-warga; yang diblur hanya teks contoh */}
              <dd className={cn("ml-auto text-right text-sm font-semibold text-concrete-800", !isVerified && "blur-[6px]")}>{isVerified ? r.v ?? "-" : r.dummy}</dd>
            </div>
          ))}
        </dl>
        {!isVerified && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/40 p-4 backdrop-blur-[1px]">
            <div className="max-w-[240px] text-center">
              <span className="mx-auto mb-2 grid size-9 place-items-center rounded-xl bg-concrete-900 text-amber-400"><Lock className="size-4" /></span>
              <p className="text-[13px] font-semibold text-concrete-900">Khusus warga terverifikasi</p>
              {!user ? (
                <>
                  <p className="mt-0.5 text-xs text-concrete-500">Masuk untuk melihat informasi penghuni.</p>
                  <button onClick={() => prompt("Masuk untuk melihat informasi penghuni")} className="mt-2.5 inline-flex h-8 items-center rounded-lg bg-brand px-3.5 text-xs font-semibold text-white">Masuk</button>
                </>
              ) : (
                <p className="mt-0.5 text-xs text-concrete-500">Akun Anda belum diverifikasi pengurus. <Link href="/warga/akun" className="font-semibold text-maroon-600">Cek status</Link></p>
              )}
            </div>
          </div>
        )}
      </div>

      {isVerified && <p className="mt-3 text-xs text-concrete-500">Untuk rumah dengan akun terverifikasi, jumlah menunjukkan akun terdaftar, bukan seluruh penghuni. Rumah tanpa akun terverifikasi menggunakan data manual pengurus.</p>}

      {isVerified && hasPhone && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${h.phone.replace(/\D/g, "")}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-concrete-200 text-sm font-medium text-concrete-700 hover:bg-concrete-50">
            <Phone className="size-4" /> Telepon
          </a>
          <a href={waLink(h.phone)} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-sage-500 text-sm font-medium text-white hover:bg-sage-600">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

export function DenahView() {
  const { data, isVerified, user } = useStore();
  const [linked, setLinked] = useState<{ house_id: string; account_count: number; owner_name: string | null; owner_phone: string | null }[]>([]);
  const [linkedError, setLinkedError] = useState(false);
  useEffect(() => {
    if (!isVerified || !user) { setLinked([]); return; }
    let cancelled = false;
    setLinked([]); setLinkedError(false);
    const load = async () => {
      const { data: rows, error } = await getSupabase().rpc("denah_profil");
      if (!cancelled) { if (error) setLinkedError(true); else setLinked(rows ?? []); }
    };
    void load();
    return () => { cancelled = true; };
  }, [isVerified, user]);
  const houses = useMemo(() => data.houses.map((h) => {
    const linkedHouse = linked.find((r) => r.house_id === h.id);
    return linkedHouse ? { ...h, owner: linkedHouse.owner_name ?? "Belum dibagikan", phone: linkedHouse.owner_phone ?? "-", penghuni: Number(linkedHouse.account_count) } : h;
  }), [data.houses, linked]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<HouseStatus | "all">("all");
  const [blok, setBlok] = useState("all");
  const [sel, setSel] = useState<House | null>(null);
  const [zoom, setZoom] = useState(1);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const highlight = useMemo(() => {
    if (!q && filter === "all" && blok === "all") return null;
    const s = q.toLowerCase();
    return new Set(
      houses
        .filter((h) => (filter === "all" || h.status === filter) && (blok === "all" || h.blok === blok))
        .filter((h) => !s || (isVerified && (h.owner ?? "").toLowerCase().includes(s)) || `${h.blok}${h.nomor}`.toLowerCase().includes(s.replace(/[-\s]/g, "")))
        .map((h) => h.id),
    );
  }, [houses, q, filter, blok, isVerified]);

  const bloks = useMemo(() => [...new Set(houses.map((h) => h.blok))].sort(), [houses]);

  const counts = useMemo(() => {
    const c = { dihuni: 0, disewakan: 0, kosong: 0 };
    houses.forEach((h) => c[h.status]++);
    return c;
  }, [houses]);

  return (
    <>
      {linkedError && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">Data profil belum dapat dimuat; data rumah yang tersimpan ditampilkan.</p>}
      <PageHeader
        index="01"
        eyebrow="Pemetaan Rumah"
        title="Denah Perumahan Padma"
        description={isVerified ? "Klik salah satu unit rumah pada denah untuk melihat informasi pemilik dan kontaknya." : "Klik unit rumah untuk melihat statusnya. Informasi penghuni hanya untuk warga terverifikasi."}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* toolbar */}
          <div className="card flex flex-col gap-3 p-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isVerified ? "Cari nama pemilik atau nomor (mis. A5)" : "Cari nomor rumah (mis. A5)"} className="pl-10" />
            </div>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {["all", ...bloks].map((b) => (
                <button
                  key={b}
                  onClick={() => setBlok(b)}
                  className={cn(
                    "h-11 shrink-0 rounded-xl px-3.5 font-mono text-xs font-semibold transition",
                    blok === b ? "bg-concrete-900 text-white" : "bg-concrete-100 text-concrete-600 hover:bg-concrete-200",
                  )}
                >
                  {b === "all" ? "SEMUA" : `BLOK ${b}`}
                </button>
              ))}
            </div>
          </div>

          {/* map */}
          <div className="card relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-concrete-100 px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilter("all")}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition", filter === "all" ? "bg-concrete-900 text-white ring-concrete-900" : "ring-concrete-200 text-concrete-600")}
                >
                  Semua · {houses.length}
                </button>
                {(Object.keys(statusStyle) as HouseStatus[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(filter === k ? "all" : k)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
                      filter === k ? "bg-concrete-900 text-white ring-concrete-900" : "ring-concrete-200 text-concrete-600",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", statusStyle[k].dot)} />
                    {statusStyle[k].label} · {counts[k]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-concrete-100 p-1">
                <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="grid size-7 place-items-center rounded-lg text-concrete-600 hover:bg-white" aria-label="Perkecil"><Minus className="size-3.5" /></button>
                <span className="w-10 text-center font-mono text-[11px] text-concrete-600">{zoom * 100}%</span>
                <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.5))} className="grid size-7 place-items-center rounded-lg text-concrete-600 hover:bg-white" aria-label="Perbesar"><Plus className="size-3.5" /></button>
              </div>
            </div>
            <div className="overflow-auto bg-concrete-50">
              <div className="min-w-[720px] p-3 transition-[width] duration-300" style={{ width: `${zoom * 100}%` }}>
                <HouseMap houses={houses} selected={sel?.id} onSelect={setSel} highlight={highlight} />
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-concrete-100 px-4 py-2.5 text-xs text-concrete-500 md:hidden">
              <MousePointerClick className="size-3.5" /> Geser untuk melihat seluruh denah, ketuk rumah untuk detail.
            </div>
          </div>
        </div>

        {/* side panel desktop */}
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-4">
            <div className="label-mono mb-3">Detail Unit</div>
            {sel ? (
              <HouseDetail key={sel.id} h={sel} />
            ) : (
              <div className="bg-blueprint flex flex-col items-center rounded-2xl border border-dashed border-concrete-300 px-6 py-14 text-center">
                <MousePointerClick className="mb-3 size-6 text-maroon-500" />
                <p className="font-medium text-concrete-800">Pilih rumah pada denah</p>
                <p className="mt-1 text-sm text-concrete-500">Informasi pemilik akan tampil di sini.</p>
              </div>
            )}
            {highlight && (
              <div className="mt-4 rounded-xl bg-maroon-50 px-3.5 py-2.5 text-xs text-maroon-700">
                <Badge tone="maroon">{highlight.size}</Badge> rumah sesuai filter
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* sheet mobile */}
      <Modal open={!isDesktop && !!sel} onClose={() => setSel(null)} title="Detail Rumah" subtitle="Informasi pemilik unit">
        {sel && <HouseDetail h={sel} />}
      </Modal>
    </>
  );
}
