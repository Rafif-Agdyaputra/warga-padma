"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, HandCoins } from "lucide-react";
import { useStore } from "@/lib/store";
import { rupiah, tanggal } from "@/lib/utils";
import type { Akun } from "@/lib/types";
import { Badge, EmptyState, PageHeader, Progress, Tabs } from "@/components/ui";

export function TransparansiView() {
  const { data } = useStore();
  const [akun, setAkun] = useState<Akun | "all">("all");
  const list = data.kebutuhan.filter((k) => akun === "all" || k.akun === akun);
  const target = list.reduce((s, k) => s + k.target, 0);
  const got = list.reduce((s, k) => s + k.terkumpul, 0);

  return (
    <>
      <PageHeader index="09" eyebrow="Transparansi" title="Kebutuhan Warga & Mushala" description="Daftar kebutuhan bersama beserta progres dana yang terkumpul, agar setiap rupiah dapat dipantau seluruh warga." />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {[
          { label: "Total Kebutuhan", v: rupiah(target) },
          { label: "Dana Terkumpul", v: rupiah(got) },
          { label: "Kekurangan", v: rupiah(Math.max(0, target - got)) },
        ].map((s, i) => (
          <div key={s.label} className="card rivets animate-rise p-5 pt-7" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="label-mono">{s.label}</div>
            <div className={`mt-1.5 font-display text-2xl font-semibold ${i === 1 ? "text-sage-600" : i === 2 ? "text-maroon-700" : ""}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <Tabs value={akun} onChange={setAkun} items={[{ value: "all", label: "Semua" }, { value: "warga", label: "Kebutuhan Warga" }, { value: "mushala", label: "Kebutuhan Mushala" }]} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={HandCoins} title="Belum ada kebutuhan" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((k, i) => {
            const pct = Math.round((k.terkumpul / k.target) * 100);
            const done = k.status === "terpenuhi";
            return (
              <article key={k.id} className="card animate-rise p-5 md:p-6" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-2">
                  <Badge tone={k.akun === "warga" ? "maroon" : "sage"}>{k.akun === "warga" ? "Warga" : "Mushala"}</Badge>
                  {done ? <Badge tone="sage"><CheckCircle2 className="size-3" />Terpenuhi</Badge> : <Badge tone="amber" dot>Berjalan</Badge>}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{k.title}</h3>
                <p className="mt-1 text-sm text-concrete-500">{k.description}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="label-mono">Terkumpul</div>
                    <div className="font-display text-xl font-semibold text-concrete-900">{rupiah(k.terkumpul)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-semibold text-maroon-700">{pct}%</div>
                    <div className="text-xs text-concrete-500">dari {rupiah(k.target)}</div>
                  </div>
                </div>
                <div className="mt-3"><Progress value={pct} tone={done ? "sage" : "maroon"} /></div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-concrete-500">
                  <CalendarClock className="size-3.5" /> Target {tanggal(k.deadline, { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
