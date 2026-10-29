"use client";

import { MessageSquareWarning } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge, StatusBadge } from "@/components/ui";
import { tanggal, today } from "@/lib/utils";

const progressTone = { diterima: "neutral", diproses: "amber", selesai: "sage" } as const;

export default function Page() {
  return (
    <CrudPage
      collection="pengaduan"
      index="03"
      eyebrow="Konten Warga"
      title="Pengaduan"
      description="Verifikasi pengaduan sebelum ditayangkan. Tolak laporan yang terindikasi palsu atau mengandung fitnah."
      icon={MessageSquareWarning}
      moderated
      idPrefix="a"
      searchKeys={["title", "reporter", "blokRumah"]}
      sort={(a, b) => b.createdAt.localeCompare(a.createdAt)}
      defaults={{ status: "draft", progress: "diterima", category: "Fasilitas", anonymous: false, createdAt: today() }}
      columns={[
        { label: "Judul", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.title}</span> },
        { label: "Pelapor", render: (r) => `${r.reporter}${r.anonymous ? " · anonim" : ""}` },
        { label: "Lokasi", render: (r) => r.blokRumah },
        { label: "Progres", render: (r) => <Badge tone={progressTone[r.progress]}>{r.progress}</Badge> },
        { label: "Tanggal", render: (r) => tanggal(r.createdAt), className: "whitespace-nowrap" },
        { label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { key: "title", label: "Judul", required: true, full: true },
        { key: "category", label: "Kategori", type: "select", options: ["Keamanan", "Kebersihan", "Fasilitas", "Lingkungan", "Lainnya"] },
        { key: "blokRumah", label: "Lokasi / Rumah", required: true },
        { key: "content", label: "Isi pengaduan", type: "textarea", required: true },
        { key: "reporter", label: "Nama pelapor", required: true },
        { key: "anonymous", label: "Tampilkan anonim", type: "checkbox" },
        { key: "progress", label: "Progres penanganan", type: "select", options: [{ value: "diterima", label: "Diterima" }, { value: "diproses", label: "Diproses" }, { value: "selesai", label: "Selesai" }] },
        { key: "status", label: "Status tayang", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Tayang" }, { value: "rejected", label: "Ditolak" }] },
        { key: "response", label: "Tanggapan pengurus", type: "textarea", placeholder: "Ditampilkan ke warga" },
        { key: "image", label: "Foto bukti", type: "image" },
      ]}
    />
  );
}
