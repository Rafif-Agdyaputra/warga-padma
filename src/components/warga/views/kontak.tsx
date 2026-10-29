"use client";

import { Building2, Copy, Phone, Shield, Siren, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Kontak } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

const groups: { key: Kontak["group"]; icon: typeof Phone; tone: string }[] = [
  { key: "Pengurus RT", icon: UserRound, tone: "bg-maroon-50 text-maroon-700" },
  { key: "Keamanan", icon: Shield, tone: "bg-sage-50 text-sage-600" },
  { key: "Darurat", icon: Siren, tone: "bg-amber-50 text-amber-600" },
  { key: "Layanan", icon: Building2, tone: "bg-concrete-100 text-concrete-600" },
];

export function KontakView() {
  const { data } = useStore();
  const toast = useToast();

  return (
    <>
      <PageHeader index="06" eyebrow="Direktori" title="Nomor Telepon Penting" description="Simpan nomor-nomor berikut untuk keperluan sehari-hari maupun keadaan darurat." />

      {/* darurat besar */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {data.kontak.filter((k) => k.group === "Darurat").map((k) => (
          <a key={k.id} href={`tel:${k.phone}`} className="group relative overflow-hidden rounded-2xl bg-concrete-900 p-4 text-white transition hover:-translate-y-0.5 md:p-5">
            <div className="hairline-stripe absolute inset-x-0 top-0 h-1" />
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">{k.name}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-amber-400 md:text-4xl">{k.phone}</div>
            <Phone className="absolute bottom-4 right-4 size-5 text-white/30 transition group-hover:text-white" />
          </a>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {groups.filter((g) => g.key !== "Darurat").map((g) => (
          <section key={g.key} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-concrete-100 px-5 py-4">
              <span className={`grid size-9 place-items-center rounded-xl ${g.tone}`}><g.icon className="size-4" /></span>
              <h2 className="font-semibold">{g.key}</h2>
            </div>
            <ul className="divide-y divide-concrete-100">
              {data.kontak.filter((k) => k.group === g.key).map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-concrete-800">{k.name}</div>
                    <div className="font-mono text-[13px] text-concrete-500">{k.phone}{k.note && <span className="ml-2 font-sans text-xs text-sage-600">· {k.note}</span>}</div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(k.phone); toast("Nomor disalin"); }}
                    className="grid size-9 place-items-center rounded-full text-concrete-500 hover:bg-concrete-100"
                    aria-label="Salin"
                  >
                    <Copy className="size-4" />
                  </button>
                  <a href={`tel:${k.phone.replace(/[^\d+]/g, "")}`} className="grid size-9 place-items-center rounded-full bg-sage-500 text-white hover:bg-sage-600" aria-label="Telepon">
                    <Phone className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
