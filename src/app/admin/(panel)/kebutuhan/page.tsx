"use client";

import { HandCoins } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge, Progress } from "@/components/ui";
import { rupiah, tanggal } from "@/lib/utils";

export default function Page() {
  return (
    <CrudPage
      collection="kebutuhan"
      index="09"
      eyebrow="Keuangan"
      title="Kebutuhan"
      description="Daftar kebutuhan warga & mushala untuk halaman transparansi."
      icon={HandCoins}
      idPrefix="n"
      searchKeys={["title"]}
      filter={{ key: "akun", options: [{ value: "warga", label: "Warga" }, { value: "mushala", label: "Mushala" }] }}
      defaults={{ akun: "warga", status: "berjalan", target: 0, terkumpul: 0 }}
      transform={(v) => ({ ...v, target: Number(v.target) || 0, terkumpul: Number(v.terkumpul) || 0 })}
      columns={[
        { label: "Kebutuhan", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.title}</span> },
        { label: "Akun", render: (r) => <Badge tone={r.akun === "warga" ? "maroon" : "sage"}>{r.akun}</Badge> },
        {
          label: "Progres",
          className: "min-w-44",
          render: (r) => (
            <div>
              <div className="mb-1 font-mono text-xs">{rupiah(r.terkumpul)} / {rupiah(r.target)}</div>
              <Progress value={(r.terkumpul / Math.max(1, r.target)) * 100} tone={r.status === "terpenuhi" ? "sage" : "maroon"} />
            </div>
          ),
        },
        { label: "Target", render: (r) => tanggal(r.deadline), className: "whitespace-nowrap" },
        { label: "Status", render: (r) => <Badge tone={r.status === "terpenuhi" ? "sage" : "amber"} dot>{r.status}</Badge> },
      ]}
      fields={[
        { key: "title", label: "Nama kebutuhan", required: true },
        { key: "akun", label: "Akun", type: "select", options: [{ value: "warga", label: "Warga" }, { value: "mushala", label: "Mushala" }] },
        { key: "description", label: "Deskripsi", type: "textarea" },
        { key: "target", label: "Target dana (Rp)", type: "number", required: true },
        { key: "terkumpul", label: "Terkumpul (Rp)", type: "number" },
        { key: "deadline", label: "Target tanggal", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: [{ value: "berjalan", label: "Berjalan" }, { value: "terpenuhi", label: "Terpenuhi" }] },
      ]}
    />
  );
}
