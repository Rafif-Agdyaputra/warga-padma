"use client";

import { Megaphone } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge, StatusBadge } from "@/components/ui";
import { tanggal, today } from "@/lib/utils";

export default function Page() {
  return (
    <CrudPage
      collection="pengumuman"
      index="02"
      eyebrow="Konten Warga"
      title="Pengumuman"
      description="Buat pengumuman sebagai draft, lalu setujui untuk menayangkannya ke warga."
      icon={Megaphone}
      moderated
      idPrefix="p"
      searchKeys={["title", "content", "author"]}
      sort={(a, b) => b.date.localeCompare(a.date)}
      defaults={{ status: "draft", date: today(), category: "Umum", priority: "normal", author: "Ketua RT" }}
      columns={[
        { label: "Judul", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.title}</span> },
        { label: "Kategori", render: (r) => r.category },
        { label: "Prioritas", render: (r) => (r.priority === "penting" ? <Badge tone="maroon">Penting</Badge> : <Badge>Normal</Badge>) },
        { label: "Tanggal", render: (r) => tanggal(r.date), className: "whitespace-nowrap" },
        { label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { key: "title", label: "Judul", required: true, full: true },
        { key: "category", label: "Kategori", type: "select", options: ["Umum", "Keamanan", "Kebersihan", "Keuangan", "Ibadah"] },
        { key: "priority", label: "Prioritas", type: "select", options: [{ value: "normal", label: "Normal" }, { value: "penting", label: "Penting" }] },
        { key: "date", label: "Tanggal", type: "date", required: true },
        { key: "author", label: "Diterbitkan oleh", required: true },
        { key: "content", label: "Isi pengumuman", type: "textarea", required: true },
        { key: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Tayang" }, { value: "rejected", label: "Ditolak" }] },
      ]}
    />
  );
}
