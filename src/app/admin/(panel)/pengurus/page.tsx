"use client";

import { Users } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";

export default function Page() {
  return (
    <CrudPage
      collection="pengurus"
      index="06"
      eyebrow="Data Lingkungan"
      title="Pengurus"
      description="Susunan pengurus harian. Pengurus dengan urutan terkecil ditampilkan sebagai Ketua di halaman warga."
      icon={Users}
      idPrefix="g"
      defaults={{ periode: "2025–2028", urutan: 0 }}
      columns={[
        { label: "Nama", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.name}</span> },
        { label: "Jabatan", render: (r) => r.role },
        { label: "Telepon", render: (r) => <span className="font-mono text-xs">{r.phone}</span> },
        { label: "Rumah", render: (r) => r.blokRumah },
        { label: "Periode", render: (r) => r.periode },
      ]}
      fields={[
        { key: "name", label: "Nama", required: true },
        { key: "role", label: "Jabatan", required: true },
        { key: "phone", label: "Telepon", type: "tel", required: true },
        { key: "blokRumah", label: "Nomor rumah" },
        { key: "periode", label: "Periode" },
        { key: "urutan", label: "Urutan tampil", type: "number", hint: "Angka kecil tampil lebih dulu; urutan pertama = Ketua" },
      ]}
    />
  );
}
