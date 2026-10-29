"use client";

import { Phone } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui";

const groups = ["Pengurus RT", "Keamanan", "Darurat", "Layanan"];

export default function Page() {
  return (
    <CrudPage
      collection="kontak"
      index="07"
      eyebrow="Data Lingkungan"
      title="Nomor Penting"
      description="Daftar nomor telepon penting termasuk pengurus RT, keamanan, dan layanan darurat."
      icon={Phone}
      idPrefix="c"
      searchKeys={["name", "phone"]}
      filter={{ key: "group", options: groups.map((g) => ({ value: g, label: g })) }}
      defaults={{ group: "Pengurus RT" }}
      columns={[
        { label: "Nama", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.name}</span> },
        { label: "Grup", render: (r) => <Badge>{r.group}</Badge> },
        { label: "Telepon", render: (r) => <span className="font-mono text-xs">{r.phone}</span> },
        { label: "Catatan", render: (r) => r.note ?? "-" },
      ]}
      fields={[
        { key: "name", label: "Nama / instansi", required: true, full: true },
        { key: "group", label: "Grup", type: "select", options: groups },
        { key: "phone", label: "Telepon", required: true },
        { key: "note", label: "Catatan", full: true },
      ]}
    />
  );
}
