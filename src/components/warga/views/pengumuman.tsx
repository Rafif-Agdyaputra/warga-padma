"use client";

import { useState } from "react";
import { Megaphone, Pin } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, tanggal } from "@/lib/utils";
import type { Pengumuman } from "@/lib/types";
import { Badge, EmptyState, Modal, PageHeader, Tabs } from "@/components/ui";

const cats = ["Semua", "Umum", "Keamanan", "Kebersihan", "Keuangan", "Ibadah"] as const;

export function PengumumanView() {
  const { data } = useStore();
  const [cat, setCat] = useState<(typeof cats)[number]>("Semua");
  const [open, setOpen] = useState<Pengumuman | null>(null);

  const list = data.pengumuman
    .filter((p) => p.status === "published" && (cat === "Semua" || p.category === cat))
    .sort((a, b) => (a.priority === b.priority ? b.date.localeCompare(a.date) : a.priority === "penting" ? -1 : 1));

  return (
    <>
      <PageHeader index="03" eyebrow="Info Resmi" title="Pengumuman Warga" description="Informasi resmi dari pengurus RT. Pengumuman diterbitkan setelah melalui persetujuan admin." />

      <div className="mb-5">
        <Tabs value={cat} onChange={setCat} items={cats.map((c) => ({ value: c, label: c }))} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Megaphone} title="Belum ada pengumuman" />
      ) : (
        <div className="relative space-y-3 md:pl-8">
          <div className="absolute bottom-4 left-[11px] top-4 hidden w-px bg-concrete-200 md:block" />
          {list.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setOpen(p)}
              className="card group relative block w-full animate-rise p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift md:p-6"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={cn(
                "absolute -left-8 top-7 hidden size-[22px] place-items-center rounded-full border-4 border-concrete-50 md:grid",
                p.priority === "penting" ? "bg-maroon-600" : "bg-concrete-300",
              )} />
              <div className="flex flex-wrap items-center gap-2">
                {p.priority === "penting" && <Badge tone="maroon"><Pin className="size-3" />Penting</Badge>}
                <Badge tone="sage">{p.category}</Badge>
                <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-concrete-400">{tanggal(p.date)}</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold transition group-hover:text-maroon-700">{p.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-concrete-500">{p.content}</p>
              <div className="mt-3 text-xs font-medium text-concrete-500">— {p.author}</div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""} subtitle={open ? `${open.category} · ${tanggal(open.date, { day: "numeric", month: "long", year: "numeric" })}` : ""}>
        {open && (
          <>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-concrete-700">{open.content}</p>
            <div className="mt-6 flex items-center gap-2 border-t border-concrete-100 pt-4 text-sm text-concrete-500">
              <Megaphone className="size-4 text-maroon-600" /> Diterbitkan oleh <b className="text-concrete-800">{open.author}</b>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
