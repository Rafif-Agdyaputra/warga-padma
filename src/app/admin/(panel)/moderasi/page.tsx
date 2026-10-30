"use client";

import { useState } from "react";
import { CalendarDays, Check, Inbox, Megaphone, MessageSquareWarning, Store, X } from "lucide-react";
import { pengaduanPhotoUrl } from "@/lib/pengaduan-photo";
import { useStore } from "@/lib/store";
import { tanggal } from "@/lib/utils";
import type { StoreData } from "@/lib/types";
import { Badge, Button, Cover, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

type Key = "kegiatan" | "pengumuman" | "pengaduan" | "umkm";
interface Item { key: Key; id: string; title: string; body: string; meta: string; date: string; image?: string }

const icons = { kegiatan: CalendarDays, pengumuman: Megaphone, pengaduan: MessageSquareWarning, umkm: Store };
const labels = { kegiatan: "Kegiatan", pengumuman: "Pengumuman", pengaduan: "Pengaduan", umkm: "UMKM" };

function collect(d: StoreData): Item[] {
  return [
    ...d.kegiatan.filter((x) => x.status === "draft").map((x) => ({ key: "kegiatan" as const, id: x.id, title: x.title, body: x.description, meta: `${x.author} · ${x.blokRumah} · ${x.location}`, date: x.createdAt, image: x.image })),
    ...d.pengumuman.filter((x) => x.status === "draft").map((x) => ({ key: "pengumuman" as const, id: x.id, title: x.title, body: x.content, meta: `${x.author} · ${x.category}`, date: x.date })),
    ...d.pengaduan.filter((x) => x.status === "draft").map((x) => ({ key: "pengaduan" as const, id: x.id, title: x.title, body: x.content, meta: `${x.reporter}${x.anonymous ? " (tampil anonim)" : ""} · ${x.blokRumah} · ${x.category}`, date: x.createdAt, image: pengaduanPhotoUrl(x.image) })),
    ...d.umkm.filter((x) => x.status === "draft").map((x) => ({ key: "umkm" as const, id: x.id, title: x.name, body: x.description, meta: `${x.owner} · ${x.blokRumah} · ${x.price}`, date: x.createdAt, image: x.image })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export default function ModerasiPage() {
  const { data, update } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Key | "all">("all");
  const all = collect(data);
  const list = all.filter((i) => tab === "all" || i.key === tab);

  const act = async (i: Item, status: "published" | "rejected") => {
    if (!(await update(i.key, i.id, { status }))) return;
    toast(status === "published" ? `"${i.title}" ditayangkan` : `"${i.title}" ditolak`, status === "published" ? "success" : "info");
  };

  return (
    <>
      <PageHeader index="00" eyebrow="Sistem Draft" title="Moderasi Kiriman" description="Tinjau isi dan identitas sebelum menayangkan. Nama dan lokasi pengaduan anonim disembunyikan; foto bukti tetap privat." />

      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[{ value: "all", label: "Semua", count: all.length }, ...(Object.keys(labels) as Key[]).map((k) => ({ value: k, label: labels[k], count: all.filter((i) => i.key === k).length }))]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="Antrian kosong" text="Tidak ada kiriman yang menunggu review saat ini." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((i, idx) => {
            const Icon = icons[i.key];
            return (
              <article key={i.key + i.id} className="card flex animate-rise flex-col overflow-hidden sm:flex-row" style={{ animationDelay: `${idx * 40}ms` }}>
                <div className="h-36 sm:h-auto sm:w-36 sm:shrink-0"><Cover src={i.image} seed={i.id} icon={Icon} /></div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone="amber" dot>{labels[i.key]}</Badge>
                    <span className="ml-auto font-mono text-[11px] text-concrete-400">{tanggal(i.date)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-concrete-900">{i.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-concrete-600">{i.body}</p>
                  <p className="mt-2 text-xs text-concrete-500">{i.meta}</p>
                  <div className="mt-auto flex gap-2 pt-4">
                    <Button size="sm" variant="secondary" icon={Check} onClick={() => act(i, "published")}>Setujui</Button>
                    <Button size="sm" variant="outline" icon={X} onClick={() => act(i, "rejected")}>Tolak</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
