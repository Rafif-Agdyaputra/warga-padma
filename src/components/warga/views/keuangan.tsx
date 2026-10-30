"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, rupiah, saldo, tanggal, totals } from "@/lib/utils";
import type { Akun } from "@/lib/types";
import { Button, PageHeader, Tabs } from "@/components/ui";
import { useLoginPrompt } from "../auth";

export function KeuanganView() {
  const { data, user } = useStore();
  const login = useLoginPrompt();
  const [akun, setAkun] = useState<Akun>("warga");
  const [type, setType] = useState<"all" | "masuk" | "keluar">("all");

  const tx = data.transaksi.filter((t) => t.akun === akun && (type === "all" || t.type === type)).sort((a, b) => b.date.localeCompare(a.date));
  const t = totals(data.transaksi, akun);

  // breakdown pengeluaran per kategori
  const out = data.transaksi.filter((x) => x.akun === akun && x.type === "keluar");
  const byCat = Object.entries(out.reduce<Record<string, number>>((m, x) => ({ ...m, [x.category]: (m[x.category] ?? 0) + x.amount }), {})).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...byCat.map((c) => c[1]));

  if (!user) return <>
    <PageHeader index="08" eyebrow="Keuangan Warga" title="Saldo Kas Bersama" description="Laporan kas warga dan mushola yang dikelola bendahara." />
    <div className="relative overflow-hidden rounded-3xl">
      <div aria-hidden="true" className="pointer-events-none select-none space-y-5 blur-sm">
        <div className="grid gap-4 md:grid-cols-2">{["Kas Warga", "Kas Mushola Daarul Hikmah"].map((label) => <div key={label} className="rounded-3xl bg-concrete-800 p-6 text-white"><p className="text-sm">{label}</p><p className="mt-5 text-3xl font-semibold">Rp •••••••</p><p className="mt-6 text-sm">Pemasukan &nbsp;&nbsp;&nbsp; Pengeluaran</p></div>)}</div>
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">{["Riwayat Transaksi", "Alokasi Pengeluaran"].map((label) => <div key={label} className="card min-h-48 p-5"><p className="font-semibold">{label}</p><div className="mt-5 space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-5 rounded bg-concrete-200" />)}</div></div>)}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/45 p-4"><div className="rounded-2xl border border-concrete-200 bg-white p-6 text-center shadow-lift"><h2 className="font-semibold text-concrete-900">Masuk untuk melihat laporan keuangan</h2><p className="mt-2 text-sm text-concrete-600">Saldo, transaksi, dan alokasi pengeluaran tersedia setelah Anda masuk.</p><Button className="mt-4" onClick={() => login("Masuk untuk melihat laporan keuangan")}>Masuk</Button></div></div>
    </div>
  </>;

  return (
    <>
      <PageHeader index="08" eyebrow="Keuangan Warga" title="Saldo Kas Bersama" description="Laporan kas warga dan mushala yang dikelola bendahara. Diperbarui setiap ada pemasukan maupun pengeluaran." />

      {/* saldo cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {([
          { k: "warga" as const, label: "Kas Warga", icon: Wallet, cls: "bg-brand" },
          { k: "mushala" as const, label: "Kas Mushola Daarul Hikmah", icon: Landmark, cls: "bg-sage-600" },
        ]).map((c) => {
          const tt = totals(data.transaksi, c.k);
          return (
            <button
              key={c.k}
              onClick={() => setAkun(c.k)}
              className={cn(
                "relative animate-rise overflow-hidden rounded-3xl p-6 text-left text-white transition-all md:p-7",
                c.cls,
                akun === c.k ? "shadow-lift ring-4 ring-amber-400/60" : "opacity-80 hover:opacity-100",
              )}
            >
              <div className="bg-blueprint-dark absolute inset-0" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">{c.label}</span>
                  <span className="grid size-10 place-items-center rounded-2xl bg-white/15 backdrop-blur"><c.icon className="size-5" /></span>
                </div>
                <div className="mt-4 font-display text-3xl font-semibold md:text-4xl">{rupiah(saldo(data.transaksi, c.k))}</div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-white/60"><ArrowDownLeft className="size-3.5" />Pemasukan</div>
                    <div className="mt-0.5 font-semibold">{rupiah(tt.masuk)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-white/60"><ArrowUpRight className="size-3.5" />Pengeluaran</div>
                    <div className="mt-0.5 font-semibold">{rupiah(tt.keluar)}</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-concrete-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="label-mono">Riwayat Transaksi</div>
              <h2 className="mt-1 font-semibold">{akun === "warga" ? "Kas Warga" : "Kas Mushala"}</h2>
            </div>
            <Tabs value={type} onChange={setType} items={[{ value: "all", label: "Semua" }, { value: "masuk", label: "Masuk" }, { value: "keluar", label: "Keluar" }]} />
          </div>
          <ul className="divide-y divide-concrete-100">
            {tx.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", x.type === "masuk" ? "bg-sage-50 text-sage-600" : "bg-maroon-50 text-maroon-700")}>
                  {x.type === "masuk" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-concrete-800">{x.note}</div>
                  <div className="text-xs text-concrete-500">{x.category} · {tanggal(x.date)}</div>
                </div>
                <div className={cn("shrink-0 font-mono text-sm font-semibold", x.type === "masuk" ? "text-sage-600" : "text-maroon-700")}>
                  {x.type === "masuk" ? "+" : "−"}{rupiah(x.amount).replace("Rp", "Rp ")}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card h-fit p-5">
          <div className="label-mono">Alokasi Pengeluaran</div>
          <h2 className="mt-1 font-semibold">Per Kategori</h2>
          <div className="mt-5 space-y-4">
            {byCat.map(([c, v]) => (
              <div key={c}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-concrete-700">{c}</span>
                  <span className="font-mono font-semibold text-concrete-800">{rupiah(v)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-concrete-100">
                  <div className="h-full rounded-full bg-maroon-600" style={{ width: `${(v / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-concrete-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-concrete-500">Selisih bulan ini</span><b className={t.masuk - t.keluar >= 0 ? "text-sage-600" : "text-maroon-700"}>{rupiah(t.masuk - t.keluar)}</b></div>
          </div>
        </section>
      </div>
    </>
  );
}
