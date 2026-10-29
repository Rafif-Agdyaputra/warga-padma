"use client";

import { Store } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge, StatusBadge } from "@/components/ui";
import { today } from "@/lib/utils";
import type { CatalogItem, Umkm } from "@/lib/types";
import { CatalogEditor, LinksEditor, businessStatusLabel, cleanUmkm, hoursText } from "@/components/umkm/parts";

export default function Page() {
  return (
    <CrudPage
      collection="umkm"
      index="04"
      eyebrow="Konten Warga"
      title="UMKM & Jasa"
      description="Review promosi usaha warga beserta foto, jam buka, menu/daftar jasa, dan link toko."
      icon={Store}
      moderated
      idPrefix="u"
      searchKeys={["name", "owner", "category"]}
      sort={(a, b) => b.createdAt.localeCompare(a.createdAt)}
      defaults={{ status: "draft", category: "Makanan", createdAt: today(), businessStatus: "aktif", catalog: [], links: {} }}
      transform={(v) => {
        const r = cleanUmkm(v as Partial<Umkm>);
        if (Boolean(r.openTime) !== Boolean(r.closeTime)) { r.openTime = undefined; r.closeTime = undefined; }
        return r as Record<string, unknown>;
      }}
      columns={[
        { label: "Usaha", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.name}</span> },
        { label: "Pemilik", render: (r) => r.owner },
        { label: "Kategori", render: (r) => r.category },
        { label: "Rumah", render: (r) => r.blokRumah },
        { label: "Jam", render: (r) => <span className="font-mono text-xs">{hoursText(r) ?? "-"}</span> },
        {
          label: "Kondisi",
          render: (r) => {
            const s2 = r.businessStatus ?? "aktif";
            return <Badge tone={s2 === "aktif" ? "sage" : s2 === "libur" ? "amber" : "neutral"} dot>{businessStatusLabel[s2]}</Badge>;
          },
        },
        { label: "Moderasi", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { key: "name", label: "Nama usaha", required: true },
        { key: "category", label: "Kategori", type: "select", options: ["Makanan", "Minuman", "Jasa", "Fashion", "Kebutuhan Rumah", "Lainnya"] },
        { key: "description", label: "Deskripsi", type: "textarea", required: true },
        { key: "price", label: "Kisaran harga", required: true },
        { key: "openTime", label: "Jam buka", type: "time" },
        { key: "closeTime", label: "Jam tutup", type: "time" },
        { key: "businessStatus", label: "Status usaha", type: "select", options: [{ value: "aktif", label: "Aktif" }, { value: "libur", label: "Sedang libur" }, { value: "tidak_aktif", label: "Tidak aktif" }] },
        { key: "statusNote", label: "Keterangan status", placeholder: "mis. Libur sampai 3 November", showIf: (f) => f.businessStatus !== undefined && f.businessStatus !== "aktif" },
        {
          key: "catalog", label: "Menu / daftar jasa", type: "custom",
          render: (v, set, f) => <CatalogEditor category={(f.category as Umkm["category"]) ?? "Lainnya"} value={v as CatalogItem[]} onChange={set} />,
        },
        { key: "links", label: "Link toko & sosmed", type: "custom", render: (v, set) => <LinksEditor value={v as Umkm["links"]} onChange={set} /> },
        { key: "owner", label: "Pemilik", required: true },
        { key: "blokRumah", label: "Alamat rumah", required: true },
        { key: "phone", label: "WhatsApp", type: "tel", required: true },
        { key: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Tayang" }, { value: "rejected", label: "Ditolak" }] },
        { key: "image", label: "Foto", type: "image" },
      ]}
    />
  );
}
