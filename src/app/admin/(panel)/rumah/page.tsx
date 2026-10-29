"use client";

import { Map } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui";
import { useStore } from "@/lib/store";

const tone = { dihuni: "sage", disewakan: "amber", kosong: "neutral" } as const;

export default function Page() {
  const { data } = useStore();
  const bloks = [...new Set(data.houses.map((h) => h.blok))].sort();
  return (
    <CrudPage
      collection="houses"
      index="05"
      eyebrow="Data Lingkungan"
      title="Data Rumah"
      description="Perbarui data pemilik dan status hunian. Untuk menambah unit atau mengatur posisinya pada denah, gunakan Editor Denah."
      icon={Map}
      canCreate={false}
      canDelete={false}
      searchKeys={["id", "owner", "phone"]}
      filter={{ key: "blok", options: bloks.map((b) => ({ value: b, label: `Blok ${b}` })) }}
      defaults={{}}
      columns={[
        { label: "Unit", primary: true, render: (r) => <span className="font-mono font-semibold text-concrete-900">{r.blok}-{r.nomor}</span> },
        { label: "Pemilik", render: (r) => r.owner },
        { label: "Telepon", render: (r) => <span className="font-mono text-xs">{r.phone}</span> },
        { label: "Penghuni", render: (r) => r.penghuni },
        { label: "Status", render: (r) => <Badge tone={tone[r.status]} dot>{r.status}</Badge> },
      ]}
      fields={[
        { key: "owner", label: "Nama pemilik", required: true, full: true },
        { key: "phone", label: "Telepon", type: "tel" },
        { key: "penghuni", label: "Jumlah penghuni", type: "number" },
        { key: "status", label: "Status hunian", type: "select", options: [{ value: "dihuni", label: "Dihuni" }, { value: "disewakan", label: "Disewakan" }, { value: "kosong", label: "Kosong" }] },
      ]}
    />
  );
}
