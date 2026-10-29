"use client";

import { CalendarDays } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { StatusBadge } from "@/components/ui";
import { tanggal, today } from "@/lib/utils";

export default function Page() {
  return (
    <CrudPage
      collection="kegiatan"
      index="01"
      eyebrow="Konten Warga"
      title="Kegiatan"
      description="Kelola kegiatan warga. Kiriman baru dari warga berstatus draft hingga disetujui."
      icon={CalendarDays}
      moderated
      idPrefix="k"
      searchKeys={["title", "author", "location"]}
      sort={(a, b) => b.createdAt.localeCompare(a.createdAt)}
      defaults={{ status: "draft", date: today(), createdAt: today(), author: "Admin", blokRumah: "-" }}
      columns={[
        { label: "Judul", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.title}</span> },
        { label: "Tanggal", render: (r) => tanggal(r.date), className: "whitespace-nowrap" },
        { label: "Lokasi", render: (r) => r.location },
        { label: "Pengunggah", render: (r) => `${r.author} (${r.blokRumah})` },
        { label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { key: "title", label: "Judul", required: true, full: true },
        { key: "date", label: "Tanggal", type: "date", required: true },
        { key: "location", label: "Lokasi", required: true },
        { key: "description", label: "Deskripsi", type: "textarea", required: true },
        { key: "author", label: "Pengunggah", required: true },
        { key: "blokRumah", label: "Nomor Rumah" },
        { key: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Tayang" }, { value: "rejected", label: "Ditolak" }] },
        { key: "image", label: "Foto", type: "image" },
      ]}
    />
  );
}
