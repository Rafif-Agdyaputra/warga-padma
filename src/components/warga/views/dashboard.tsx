"use client";

import Link from "next/link";
import {
  ArrowUpRight, CalendarDays, Home, MapPin, Megaphone, Phone, Store, Users, Wallet, Landmark, AlertTriangle, ChevronRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { rupiah, saldo, tanggal } from "@/lib/utils";
import { Badge, Cover } from "@/components/ui";
import { HouseMap } from "../house-map";
import { HoursLine, OpenBadge, isInactive, useNow } from "@/components/umkm/parts";
import { wargaNav } from "../nav";

export function DashboardView() {
  const { data } = useStore();
  const pengumuman = data.pengumuman.filter((p) => p.status === "published").slice(0, 3);
  const kegiatan = data.kegiatan.filter((k) => k.status === "published").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const umkm = data.umkm.filter((u) => u.status === "published").sort((a, b) => Number(isInactive(a)) - Number(isInactive(b))).slice(0, 4);
  const now = useNow();
  const dihuni = data.houses.filter((h) => h.status !== "kosong").length;
  const darurat = data.kontak.filter((k) => k.group === "Darurat" || k.group === "Keamanan").slice(0, 4);
  const sWarga = saldo(data.transaksi, "warga");
  const sMushala = saldo(data.transaksi, "mushala");

  return (
    <div className="space-y-6 md:space-y-8">
      {/* hero */}
      <section className="relative animate-rise overflow-hidden rounded-3xl bg-concrete-900 text-white shadow-lift">
        <div className="bg-blueprint-dark absolute inset-0" />
        <div className="bg-brand absolute -right-24 -top-24 size-80 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-sage-500 opacity-30 blur-3xl" />
        <div className="relative grid gap-8 p-6 md:grid-cols-[1.3fr_1fr] md:p-10">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">RT 05 · RW 12 · Perumahan Padma</span>
            </div>
            <h1 className="max-w-lg text-[28px] font-semibold leading-[1.15] text-white md:text-[42px]">
              Hunian yang tertata, <span className="text-amber-400">warga</span> yang saling terhubung.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65 md:text-[15px]">
              Semua informasi lingkungan dalam satu tempat — dari denah rumah, agenda kegiatan, hingga laporan kas yang transparan.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/warga/denah" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-concrete-900 transition hover:bg-amber-50">
                <MapPin className="size-4 text-maroon-600" /> Lihat Denah
              </Link>
              <Link href="/warga/keuangan" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Laporan Kas <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 self-end">
            {[
              { label: "Total Rumah", value: data.houses.length, icon: Home, sub: `${dihuni} terisi` },
              { label: "Pengurus", value: data.pengurus.length, icon: Users, sub: "Periode 2025–2028" },
              { label: "Kas Warga", value: rupiah(sWarga), icon: Wallet, sub: "Saldo berjalan", wide: true },
              { label: "Kas Mushala", value: rupiah(sMushala), icon: Landmark, sub: "Saldo berjalan", wide: true },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">{s.label}</span>
                  <s.icon className="size-4 text-amber-400" />
                </div>
                <div className={`mt-2 font-display font-semibold ${s.wide ? "text-base md:text-lg" : "text-2xl md:text-3xl"}`}>{s.value}</div>
                <div className="mt-0.5 text-[11px] text-white/45">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* quick menu */}
      <section className="grid animate-rise grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9 [animation-delay:80ms]">
        {wargaNav.slice(1).map((n, i) => (
          <Link
            key={n.href}
            href={n.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-concrete-200/80 bg-white p-3 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-maroon-200 hover:shadow-lift md:p-4"
          >
            <span className={`grid size-10 place-items-center rounded-xl transition-colors ${i % 3 === 0 ? "bg-maroon-50 text-maroon-700" : i % 3 === 1 ? "bg-sage-50 text-sage-600" : "bg-amber-50 text-amber-600"}`}>
              <n.icon className="size-[18px]" />
            </span>
            <span className="text-[11.5px] font-medium leading-tight text-concrete-700 md:text-xs">{n.label}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* denah preview */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-concrete-100 px-5 py-4">
            <div>
              <div className="label-mono">01 / Pemetaan</div>
              <h2 className="mt-1 text-lg font-semibold">Denah Perumahan</h2>
            </div>
            <Link href="/warga/denah" className="flex items-center gap-1 text-sm font-medium text-maroon-600 hover:text-maroon-700">
              Buka peta <ChevronRight className="size-4" />
            </Link>
          </div>
          <Link href="/warga/denah" className="block bg-concrete-50 p-3 transition hover:opacity-90">
            <HouseMap houses={data.houses} compact />
          </Link>
        </section>

        {/* pengumuman */}
        <section className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-concrete-100 px-5 py-4">
            <div>
              <div className="label-mono">02 / Info Resmi</div>
              <h2 className="mt-1 text-lg font-semibold">Pengumuman</h2>
            </div>
            <Link href="/warga/pengumuman" className="flex items-center gap-1 text-sm font-medium text-maroon-600">Semua <ChevronRight className="size-4" /></Link>
          </div>
          <div className="flex-1 divide-y divide-concrete-100">
            {pengumuman.length === 0 && <p className="px-5 py-10 text-center text-sm text-concrete-400">Belum ada pengumuman.</p>}
            {pengumuman.map((p) => (
              <Link key={p.id} href="/warga/pengumuman" className="flex gap-3 px-5 py-4 transition hover:bg-concrete-50">
                <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${p.priority === "penting" ? "bg-maroon-50 text-maroon-700" : "bg-concrete-100 text-concrete-500"}`}>
                  <Megaphone className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-concrete-800">{p.title}</span>
                    {p.priority === "penting" && <Badge tone="maroon">Penting</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-concrete-500">{p.content}</p>
                  <span className="mt-1 block font-mono text-[10.5px] uppercase tracking-wider text-concrete-400">{tanggal(p.date)} · {p.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* kegiatan */}
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-concrete-100 px-5 py-4">
            <div>
              <div className="label-mono">03 / Agenda</div>
              <h2 className="mt-1 text-lg font-semibold">Kegiatan Terdekat</h2>
            </div>
            <Link href="/warga/kegiatan" className="flex items-center gap-1 text-sm font-medium text-maroon-600">Semua <ChevronRight className="size-4" /></Link>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-3">
            {kegiatan.length === 0 && <p className="col-span-full py-8 text-center text-sm text-concrete-400">Belum ada kegiatan terjadwal.</p>}
            {kegiatan.map((k) => {
              const d = new Date(k.date + "T00:00:00");
              return (
                <Link key={k.id} href="/warga/kegiatan" className="group overflow-hidden rounded-2xl border border-concrete-200 transition hover:shadow-lift">
                  <div className="relative h-28">
                    <Cover src={k.image} seed={k.id} icon={CalendarDays} />
                    <div className="absolute left-3 top-3 rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-soft backdrop-blur">
                      <div className="font-display text-lg font-semibold leading-none text-maroon-700">{d.getDate()}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-concrete-500">{d.toLocaleDateString("id-ID", { month: "short" })}</div>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="line-clamp-1 text-sm font-semibold text-concrete-800 group-hover:text-maroon-700">{k.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-concrete-500"><MapPin className="size-3" /> {k.location}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* kontak darurat */}
        <section className="card rivets relative overflow-hidden">
          <div className="hairline-stripe h-1.5" />
          <div className="px-5 pb-2 pt-5">
            <div className="label-mono">04 / Siaga</div>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="size-4 text-amber-500" /> Nomor Penting
            </h2>
          </div>
          <div className="space-y-2 p-4 pt-2">
            {darurat.map((k) => (
              <a key={k.id} href={`tel:${k.phone.replace(/[^\d+]/g, "")}`} className="flex items-center justify-between rounded-xl bg-concrete-50 px-3.5 py-3 transition hover:bg-concrete-100">
                <div>
                  <div className="text-sm font-medium text-concrete-800">{k.name}</div>
                  <div className="font-mono text-xs text-concrete-500">{k.phone}</div>
                </div>
                <span className="grid size-8 place-items-center rounded-full bg-sage-500 text-white"><Phone className="size-3.5" /></span>
              </a>
            ))}
            <Link href="/warga/kontak" className="block pt-1 text-center text-sm font-medium text-maroon-600">Lihat semua kontak</Link>
          </div>
        </section>
      </div>

      {/* umkm */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="label-mono">05 / Produk Warga</div>
            <h2 className="mt-1 text-lg font-semibold md:text-xl">UMKM & Jasa Warga</h2>
          </div>
          <Link href="/warga/umkm" className="flex items-center gap-1 text-sm font-medium text-maroon-600">Jelajahi <ChevronRight className="size-4" /></Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:px-0">
          {umkm.length === 0 && <p className="w-full py-8 text-center text-sm text-concrete-400 md:col-span-4">Belum ada UMKM yang tayang.</p>}
          {umkm.map((u) => (
            <Link key={u.id} href="/warga/umkm" className="card w-60 shrink-0 snap-start overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift md:w-auto">
              <div className="relative h-32">
                <Cover src={u.image} seed={u.id} icon={Store} className={isInactive(u) ? "grayscale" : undefined} />
                <OpenBadge u={u} now={now} className="absolute left-2 top-2 bg-white/95 backdrop-blur" />
              </div>
              <div className={isInactive(u) ? "p-4 opacity-70" : "p-4"}>
                <Badge tone="sage">{u.category}</Badge>
                <div className="mt-2 font-semibold text-concrete-800">{u.name}</div>
                <div className="mt-0.5 text-xs text-concrete-500">Rumah {u.blokRumah} · {u.owner}</div>
                <div className="mt-2 font-mono text-[13px] font-semibold text-maroon-700">{u.price}</div>
                <HoursLine u={u} className="mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
