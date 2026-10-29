"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, Home, Inbox, Landmark, Megaphone, MessageSquareWarning, Store, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { rupiah, saldo, tanggal } from "@/lib/utils";
import { Badge, PageHeader, Progress } from "@/components/ui";

export default function AdminDashboard() {
  const { data } = useStore();
  const d = (l: { status: string }[]) => l.filter((x) => x.status === "draft").length;
  const pending = [
    { label: "Kegiatan", n: d(data.kegiatan), icon: CalendarDays, href: "/admin/kegiatan" },
    { label: "Pengumuman", n: d(data.pengumuman), icon: Megaphone, href: "/admin/pengumuman" },
    { label: "Pengaduan", n: d(data.pengaduan), icon: MessageSquareWarning, href: "/admin/pengaduan" },
    { label: "UMKM", n: d(data.umkm), icon: Store, href: "/admin/umkm" },
  ];
  const total = pending.reduce((s, p) => s + p.n, 0);
  const terisi = data.houses.filter((h) => h.status !== "kosong").length;
  const recentTx = [...data.transaksi].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const recentDrafts = [
    ...data.kegiatan.filter((x) => x.status === "draft").map((x) => ({ id: x.id, t: x.title, type: "Kegiatan", date: x.createdAt })),
    ...data.pengaduan.filter((x) => x.status === "draft").map((x) => ({ id: x.id, t: x.title, type: "Pengaduan", date: x.createdAt })),
    ...data.umkm.filter((x) => x.status === "draft").map((x) => ({ id: x.id, t: x.name, type: "UMKM", date: x.createdAt })),
    ...data.pengumuman.filter((x) => x.status === "draft").map((x) => ({ id: x.id, t: x.title, type: "Pengumuman", date: x.date })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <>
      <PageHeader eyebrow="Ringkasan" title="Selamat datang, Admin" description="Pantau kiriman warga yang menunggu review dan kondisi kas terkini." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/moderasi" className="bg-brand relative animate-rise overflow-hidden rounded-2xl p-5 text-white shadow-lift transition hover:brightness-110">
          <div className="bg-blueprint-dark absolute inset-0" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/70">Menunggu Review</span>
              <Inbox className="size-5 text-amber-400" />
            </div>
            <div className="mt-3 font-display text-4xl font-semibold">{total}</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-white/70">Buka moderasi <ArrowUpRight className="size-3.5" /></div>
          </div>
        </Link>
        {[
          { label: "Kas Warga", v: rupiah(saldo(data.transaksi, "warga")), icon: Wallet, tone: "text-maroon-600" },
          { label: "Kas Mushala", v: rupiah(saldo(data.transaksi, "mushala")), icon: Landmark, tone: "text-sage-600" },
          { label: "Rumah Terisi", v: `${terisi} / ${data.houses.length}`, icon: Home, tone: "text-amber-600", pct: (terisi / data.houses.length) * 100 },
        ].map((s, i) => (
          <div key={s.label} className="card animate-rise p-5" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="flex items-center justify-between">
              <span className="label-mono">{s.label}</span>
              <s.icon className={`size-5 ${s.tone}`} />
            </div>
            <div className="mt-3 font-display text-2xl font-semibold text-concrete-900">{s.v}</div>
            {s.pct !== undefined && <div className="mt-3"><Progress value={s.pct} tone="amber" /></div>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-5">
          <div className="label-mono">Antrian Draft</div>
          <h2 className="mt-1 font-semibold">Per Kategori</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {pending.map((p) => (
              <Link key={p.label} href={p.href} className="rounded-2xl border border-concrete-200 p-4 transition hover:border-maroon-200 hover:bg-maroon-50/30">
                <p.icon className="size-5 text-concrete-500" />
                <div className="mt-3 font-display text-2xl font-semibold">{p.n}</div>
                <div className="text-xs text-concrete-500">{p.label}</div>
              </Link>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {recentDrafts.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-concrete-50 px-3.5 py-2.5 text-sm">
                <Badge tone="amber">{r.type}</Badge>
                <span className="min-w-0 flex-1 truncate text-concrete-700">{r.t}</span>
                <span className="font-mono text-[11px] text-concrete-400">{tanggal(r.date, { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-concrete-100 px-5 py-4">
            <div>
              <div className="label-mono">Keuangan</div>
              <h2 className="mt-1 font-semibold">Transaksi Terakhir</h2>
            </div>
            <Link href="/admin/keuangan" className="text-sm font-medium text-maroon-600">Kelola</Link>
          </div>
          <ul className="divide-y divide-concrete-100">
            {recentTx.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                <Badge tone={t.akun === "warga" ? "maroon" : "sage"}>{t.akun === "warga" ? "Warga" : "Mushala"}</Badge>
                <span className="min-w-0 flex-1 truncate text-concrete-700">{t.note}</span>
                <span className={`font-mono font-semibold ${t.type === "masuk" ? "text-sage-600" : "text-maroon-700"}`}>
                  {t.type === "masuk" ? "+" : "−"}{rupiah(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
