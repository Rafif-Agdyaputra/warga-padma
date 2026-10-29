"use client";

import { Home, MessageCircle, Phone } from "lucide-react";
import { useStore } from "@/lib/store";
import { waLink } from "@/lib/utils";
import { Avatar, PageHeader } from "@/components/ui";

export function PengurusView() {
  const { data } = useStore();
  const [ketua, ...rest] = data.pengurus;

  return (
    <>
      <PageHeader index="04" eyebrow="Struktur Organisasi" title="Pengurus Harian Warga" description={`Pengurus RT 05 Perumahan Padma periode ${ketua?.periode ?? "-"}.`} />

      {ketua && (
        <div className="relative mb-6 animate-rise overflow-hidden rounded-3xl bg-concrete-900 p-6 text-white md:p-8">
          <div className="bg-blueprint-dark absolute inset-0" />
          <div className="bg-brand absolute -right-16 -top-16 size-64 rounded-full opacity-50 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <Avatar name={ketua.name} className="size-20 rounded-3xl bg-amber-400 text-2xl text-concrete-900" />
            <div className="flex-1">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-amber-400">{ketua.role}</div>
              <div className="mt-1 font-display text-2xl font-semibold md:text-3xl">{ketua.name}</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-white/60"><Home className="size-3.5" />Rumah {ketua.blokRumah}</div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${ketua.phone.replace(/\D/g, "")}`} className="flex h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-medium hover:bg-white/10"><Phone className="size-4" />Telepon</a>
              <a href={waLink(ketua.phone)} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-concrete-900 hover:bg-amber-50"><MessageCircle className="size-4 text-sage-500" />WhatsApp</a>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p, i) => (
          <div key={p.id} className="card rivets animate-rise p-5 pt-7" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-4">
              <Avatar name={p.name} className={i % 2 ? "bg-maroon-50 text-maroon-700" : ""} />
              <div className="min-w-0">
                <div className="label-mono !text-maroon-500">{p.role}</div>
                <div className="mt-0.5 truncate font-semibold text-concrete-900">{p.name}</div>
                <div className="text-xs text-concrete-500">Rumah {p.blokRumah}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-concrete-50 px-3.5 py-2.5">
              <span className="font-mono text-sm text-concrete-700">{p.phone}</span>
              <div className="flex gap-1.5">
                <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="grid size-8 place-items-center rounded-full bg-white text-concrete-600 ring-1 ring-concrete-200 hover:text-maroon-700" aria-label="Telepon"><Phone className="size-3.5" /></a>
                <a href={waLink(p.phone)} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-full bg-sage-500 text-white hover:bg-sage-600" aria-label="WhatsApp"><MessageCircle className="size-3.5" /></a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
